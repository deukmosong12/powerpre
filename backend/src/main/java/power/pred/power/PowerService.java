package power.pred.power;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PowerService {

    private final PowerRepository powerRepository;

    private static final List<String> DATE_ALIASES = Arrays.asList(
            "date_time", "datetime", "일시", "날짜시간", "시간", "측정일시"
    );

    private static final List<String> POWER_ALIASES = Arrays.asList(
            "power", "전력소비량", "전력량", "소비전력", "소비전력(kwh)"
    );

    private static final DateTimeFormatter FLEXIBLE_DT = new DateTimeFormatterBuilder()
            .appendPattern("yyyy-MM-dd HH")
            .optionalStart().appendPattern(":mm").optionalEnd()
            .optionalStart().appendPattern(":ss").optionalEnd()
            .parseDefaulting(ChronoField.MINUTE_OF_HOUR, 0)
            .parseDefaulting(ChronoField.SECOND_OF_MINUTE, 0)
            .toFormatter();

    @Transactional
    public void saveCsvToDB(Long buildingId, byte[] csvBytes) {
        List<Power> batch = new ArrayList<>();
        int saved = 0, skipped = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new ByteArrayInputStream(csvBytes), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine();
            if (headerLine == null) throw new IllegalStateException("CSV 헤더가 없습니다.");

            String[] headers = headerLine.replace("\uFEFF", "").trim().split(",");
            int dateIdx  = findColIndex(headers, DATE_ALIASES);
            int powerIdx = findColIndex(headers, POWER_ALIASES);

            if (dateIdx  < 0) throw new IllegalStateException("날짜 컬럼을 찾을 수 없습니다. 헤더: " + Arrays.toString(headers));
            if (powerIdx < 0) throw new IllegalStateException("전력 컬럼을 찾을 수 없습니다. 헤더: " + Arrays.toString(headers));

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length <= Math.max(dateIdx, powerIdx)) { skipped++; continue; }
                try {
                    LocalDateTime dt = LocalDateTime.parse(cols[dateIdx].trim(), FLEXIBLE_DT);
                    double        kw = Double.parseDouble(cols[powerIdx].trim());
                    batch.add(new Power(null, buildingId, dt, kw));
                    if (batch.size() == 500) { powerRepository.saveAll(batch); batch.clear(); }
                    saved++;
                } catch (Exception e) { skipped++; }
            }
            if (!batch.isEmpty()) powerRepository.saveAll(batch);

        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("CSV 파싱 중 오류: " + e.getMessage());
        }

        log.info("전력 데이터 저장 — buildingId={} saved={} skipped={}", buildingId, saved, skipped);
    }

    public List<Power> findByBuilding(Long buildingId) {
        return powerRepository.findByBuildingIdOrderByDateTime(buildingId);
    }

    private int findColIndex(String[] headers, List<String> aliases) {
        for (int i = 0; i < headers.length; i++) {
            String h = headers[i].trim().replace("\uFEFF", "").toLowerCase();
            if (aliases.contains(h)) return i;
        }
        return -1;
    }
}
