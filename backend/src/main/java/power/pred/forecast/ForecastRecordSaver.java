package power.pred.forecast;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// ForecastService와 분리된 별도 빈 — @Async 내부에서 @Transactional이 정상 작동하려면 self-call 금지
@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastRecordSaver {

    private final ForecastRecordRepository recordRepository;

    @Transactional
    public void saveRecords(Long jobId, JsonNode root) {
        recordRepository.deleteByJobId(jobId);

        JsonNode hourly = root.path("hourly");
        List<ForecastRecord> batch = new ArrayList<>();

        for (JsonNode node : hourly) {
            batch.add(new ForecastRecord(null, jobId,
                    node.path("dt").asText(),
                    node.path("kw").asDouble()));

            if (batch.size() == 500) {
                recordRepository.saveAll(batch);
                batch.clear();
            }
        }
        if (!batch.isEmpty()) recordRepository.saveAll(batch);

        log.info("예측 레코드 저장 완료 — jobId={} {}건", jobId, hourly.size());
    }
}
