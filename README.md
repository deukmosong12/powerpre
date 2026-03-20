# ⚡️ 전력 예측 시스템

![KakaoTalk_Photo_2026-03-20-18-30-43](https://github.com/user-attachments/assets/17a11922-cd24-4ee8-853d-5d64d992a802)

건물의 과거 전력 사용 데이터를 업로드하면, 향후 1년치 전력 수요와 예상 전기세를 자동으로 예측해주는 시스템입니다.  
여러 건물을 동시에 비교할 수 있어 에너지 관리에 활용하기 좋습니다.

---

## 기능

- CSV 파일 업로드만으로 예측 자동 시작
- 연간 전력 수요 및 전기세 예측
- 건물 간 월별 전력 사용량 비교 차트
- 관리자 / 일반 사용자 계정 분리

---

## 동작 방식

1. 회원가입 후 로그인
2. 건물명과 전력 데이터 CSV 파일 업로드
3. 백그라운드에서 머신러닝 모델이 자동으로 예측 실행
4. 조회 화면에서 그래프와 전기세 확인
5. 여러 건물 선택 시 월별 비교 테이블 제공

---

## 기술 스택

| 구분 | 사용 기술 |
|------|-----------|
| Frontend | React |
| Backend | Spring Boot 3, Spring Security |
| ML | Python, scikit-learn (HistGradientBoosting) |
| DB | MYSQL |

---

## 실행 방법

**백엔드**
```bash
cd backend
chmod +x gradlew
./gradlew clean bootRun
```

**프론트엔드**
```bash
cd frontend
npm install
npm start
```

접속: http://localhost:3000
