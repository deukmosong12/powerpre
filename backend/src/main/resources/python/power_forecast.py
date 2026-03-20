"""
power_forecast_pretrained.py
============================
사전 학습된 모델(model.pkl)을 불러와서 1년치 전력 예측.
매번 학습하지 않으므로 기존 대비 10~100배 빠름.

동작 방식:
    Java(백엔드) → stdin으로 CSV 텍스트 전달
    Python       → model.pkl 로드 → 예측 → JSON stdout 출력
    Java         → stdout JSON 파싱 → DB 저장

모델 파일 위치 탐색 순서:
    1. 환경변수 MODEL_PATH
    2. 스크립트와 같은 폴더의 model.pkl
    3. src/main/resources/python/model.pkl (개발 환경)
"""

import json
import math
import os
import pickle
import sys
import warnings
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

FORECAST_HOURS = 8760

SEASON_RATE = {
    "summer":      132.4,
    "winter":      119.0,
    "spring_fall":  91.9,
    "climate":       9.0,
    "fuel":          5.0,
}

HEADER_MAP = {
    "date_time": "dt", "datetime": "dt", "일시": "dt",
    "날짜시간":  "dt", "시간":     "dt", "측정일시": "dt",
    "power":     "pw", "전력소비량": "pw", "전력량":  "pw",
    "소비전력":  "pw", "소비전력(kwh)": "pw", "전력소비량(kwh)": "pw",
    "temp":  "temp", "기온": "temp", "온도":  "temp",
    "wind":  "wind", "풍속": "wind",
    "hum":   "hum",  "습도": "hum",
    "prec":  "prec", "강수량": "prec",
    "sun":   "sun",  "일사": "sun",  "일조": "sun",
}


# ── 모델 파일 탐색 ────────────────────────────
def find_model_path() -> str:
    # 1) 환경변수
    env = os.environ.get("MODEL_PATH")
    if env and Path(env).exists():
        return env

    # 2) 스크립트와 같은 디렉터리
    script_dir = Path(__file__).parent
    candidate  = script_dir / "model.pkl"
    if candidate.exists():
        return str(candidate)

    # 3) 개발 환경 상대 경로
    rel = Path("src/main/resources/python/model.pkl")
    if rel.exists():
        return str(rel)

    raise FileNotFoundError(
        "model.pkl을 찾을 수 없습니다.\n"
        "먼저 train_model.py 로 모델을 학습하고 같은 폴더에 저장하세요.\n"
        "또는 환경변수 MODEL_PATH 에 경로를 지정하세요."
    )


# ── CSV 파싱 (최소한의 전처리) ───────────────
def load_csv(raw: str) -> pd.DataFrame:
    import io
    raw = raw.lstrip("\ufeff")
    df  = pd.read_csv(io.StringIO(raw))

    df.rename(columns={
        c: HEADER_MAP.get(c.strip().lower().replace(" ", ""), c.strip().lower())
        for c in df.columns
    }, inplace=True)

    if "dt" not in df.columns:
        raise ValueError("날짜 컬럼을 찾을 수 없습니다.")
    if "pw" not in df.columns:
        raise ValueError("전력 컬럼을 찾을 수 없습니다.")

    df["dt"] = pd.to_datetime(df["dt"], format="mixed")
    df["pw"] = pd.to_numeric(df["pw"], errors="coerce")
    df.sort_values("dt", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


# ── 입력 CSV에서 래그 초기값용 전처리 ──────────
def extract_lag_buffer(df: pd.DataFrame) -> list:
    """업로드된 CSV의 마지막 168시간을 래그 버퍼로 추출."""
    df["pw"] = df["pw"].interpolate(method="linear").bfill().ffill()
    return df["pw"].values[-168:].tolist()


# ── 예측 ─────────────────────────────────────
def predict_year(bundle: dict, df: pd.DataFrame):
    model      = bundle["model"]
    features   = bundle["features"]
    dh_mean_tb = bundle["dh_mean_tb"]
    h_mean_tb  = bundle["h_mean_tb"]
    h_std_tb   = bundle["h_std_tb"]
    pw_mean    = bundle["pw_mean"]
    pw_std     = bundle["pw_std"]
    floor_tb   = bundle["floor_tb"]
    weather_avg = bundle.get("weather_avg", {})

    # 래그 버퍼: 업로드된 CSV가 충분하면 거기서, 부족하면 학습 데이터 것 사용
    lag_buffer = extract_lag_buffer(df)
    if len(lag_buffer) < 168:
        trained = bundle.get("last_168_pw", [pw_mean] * 168)
        lag_buffer = (trained + lag_buffer)[-168:]

    last_dt    = df["dt"].iloc[-1]
    future_dts = pd.date_range(
        start=last_dt + timedelta(hours=1),
        periods=FORECAST_HOURS,
        freq="h",
    )

    rows = []
    for dt in future_dts:
        n   = len(lag_buffer)
        row = {
            "hour":          dt.hour,
            "dow":           dt.weekday(),
            "month":         dt.month,
            "week":          int(dt.isocalendar()[1]),
            "is_weekend":    int(dt.weekday() >= 5),
            "sin_hour":      math.sin(2 * math.pi * dt.hour / 24),
            "cos_hour":      math.cos(2 * math.pi * dt.hour / 24),
            "sin_dow":       math.sin(2 * math.pi * dt.weekday() / 7),
            "cos_dow":       math.cos(2 * math.pi * dt.weekday() / 7),
            "dh_mean":       dh_mean_tb.get((dt.weekday(), dt.hour), pw_mean),
            "h_mean":        h_mean_tb.get(dt.hour, pw_mean),
            "h_std":         h_std_tb.get(dt.hour, pw_std),
            "lag_1h":        lag_buffer[-1]   if n >= 1   else 0.0,
            "lag_24h":       lag_buffer[-24]  if n >= 24  else 0.0,
            "lag_168h":      lag_buffer[-168] if n >= 168 else 0.0,
            "roll_mean_24h": float(np.mean(lag_buffer[-24:] if n >= 24 else lag_buffer)),
        }

        # 날씨: (month, hour) 평균으로 대체
        for col, avg_map in weather_avg.items():
            if col in features:
                key = f"{dt.month}_{dt.hour}"
                row[col] = avg_map.get(key, 0.0)

        rows.append(row)

    # features 순서에 맞게 정렬 후 예측
    fut   = pd.DataFrame(rows)[features]
    preds = model.predict(fut.fillna(0))

    # 하한선 적용
    floors = np.array([
        floor_tb.get((dt.weekday(), dt.hour), 0.0)
        for dt in future_dts
    ])
    preds = np.maximum(preds, floors)
    preds = np.maximum(preds, 0.0)

    # 래그 버퍼 업데이트 (다음 요청 시는 새로 시작하므로 여기선 불필요)
    return future_dts, preds


# ── 전기세 계산 ───────────────────────────────
def estimate_bill(kwh: float, month: int) -> int:
    r = SEASON_RATE
    if 6 <= month <= 8:
        unit = r["summer"]
    elif month >= 11 or month <= 2:
        unit = r["winter"]
    else:
        unit = r["spring_fall"]
    return round(kwh * (unit + r["climate"] + r["fuel"]) * 1.137)


def aggregate_monthly(dates, preds) -> list:
    tmp       = pd.DataFrame({"dt": dates, "val": preds})
    tmp["ym"] = tmp["dt"].dt.to_period("M").astype(str)

    result = []
    for ym, g in tmp.groupby("ym")["val"]:
        result.append({
            "yearMonth":  ym,
            "totalPower": round(float(g.sum()),  2),
            "avgPower":   round(float(g.mean()), 4),
            "peakPower":  round(float(g.max()),  4),
            "estBill":    estimate_bill(float(g.sum()), int(ym[5:7])),
        })
    return result


# ── 메인 ─────────────────────────────────────
def main():
    # 1. CSV stdin 읽기
    raw = sys.stdin.read()
    if not raw.strip():
        sys.stdout.write(json.dumps(
            {"status": "error", "message": "입력 데이터가 없습니다."},
            ensure_ascii=False
        ))
        sys.exit(1)

    # 2. 모델 로드
    try:
        model_path = find_model_path()
        with open(model_path, "rb") as f:
            bundle = pickle.load(f)
    except FileNotFoundError as e:
        sys.stdout.write(json.dumps(
            {"status": "error", "message": str(e)},
            ensure_ascii=False
        ))
        sys.exit(1)

    # 3. CSV 파싱
    try:
        df = load_csv(raw)
    except Exception as e:
        sys.stdout.write(json.dumps(
            {"status": "error", "message": f"CSV 파싱 오류: {e}"},
            ensure_ascii=False
        ))
        sys.exit(1)

    if len(df) < 24:
        sys.stdout.write(json.dumps(
            {"status": "error", "message": f"데이터가 너무 적습니다 ({len(df)}행, 최소 24행 필요)"},
            ensure_ascii=False
        ))
        sys.exit(1)

    # 4. 예측 (모델 재학습 없음 — 로드만 함)
    try:
        dates, preds = predict_year(bundle, df)
    except Exception as e:
        sys.stdout.write(json.dumps(
            {"status": "error", "message": f"예측 오류: {e}"},
            ensure_ascii=False
        ))
        sys.exit(1)

    # 5. 결과 직렬화
    monthly     = aggregate_monthly(dates, preds)
    total_kwh   = float(np.sum(preds))
    yearly_bill = sum(m["estBill"] for m in monthly)

    output = {
        "status":        "ok",
        "forecastStart": str(dates[0])[:19],
        "forecastEnd":   str(dates[-1])[:19],
        "totalKwh":      round(total_kwh, 2),
        "estimatedBill": yearly_bill,
        "bestIteration": int(getattr(bundle["model"], "best_iteration", None) or getattr(bundle["model"], "n_iter_", 0)),
        "trainRows":     len(df),
        "monthly":       monthly,
        "hourly": [
            {"dt": str(d)[:19], "kw": round(float(p), 4)}
            for d, p in zip(dates, preds)
        ],
    }

    sys.stdout.write(json.dumps(output, ensure_ascii=False))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
