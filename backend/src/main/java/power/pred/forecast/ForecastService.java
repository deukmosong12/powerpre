package power.pred.forecast;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import power.pred.building.Building;
import power.pred.building.BuildingRepository;

import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastService {

    private final BuildingRepository       buildingRepository;
    private final ForecastJobRepository    jobRepository;
    private final ForecastRecordRepository recordRepository;
    private final ForecastRecordSaver      recordSaver;
    private final ObjectMapper             mapper = new ObjectMapper();

    @Transactional
    public Long submitForecast(Long buildingId) {
        buildingRepository.findById(buildingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 건물입니다. id=" + buildingId));
        ForecastJob job = new ForecastJob(buildingId);
        jobRepository.save(job);
        runAsync(job.getId(), buildingId);
        return job.getId();
    }

    public ForecastJob getJob(Long jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 jobId: " + jobId));
    }

    public ForecastJob getLatestJob(Long buildingId) {
        return jobRepository.findTopByBuildingIdOrderByCreatedAtDesc(buildingId)
                .orElseThrow(() -> new IllegalStateException("예측 결과가 없습니다. 먼저 예측을 실행하세요."));
    }

    public List<ForecastRecord> getHourlyRecords(Long buildingId) {
        ForecastJob job = getLatestJob(buildingId);
        if (job.getStatus() != ForecastJob.Status.DONE) {
            throw new IllegalStateException("예측이 완료되지 않았습니다. 현재 상태: " + job.getStatus());
        }
        return recordRepository.findByJobIdOrderByForecastDtAsc(job.getId());
    }

    @Async("forecastExecutor")
    public void runAsync(Long jobId, Long buildingId) {
        ForecastJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        job.markRunning();
        jobRepository.save(job);

        try {
            Building building = buildingRepository.findById(buildingId)
                    .orElseThrow(() -> new IllegalStateException("건물 정보를 찾을 수 없습니다."));

            if (building.getCsvData() == null) {
                throw new IllegalStateException("CSV 데이터가 없습니다. 파일을 업로드하세요.");
            }

            String csv    = new String(building.getCsvData(), StandardCharsets.UTF_8);
            String output = runPython(csv);
            JsonNode root = mapper.readTree(output);

            if ("error".equals(root.path("status").asText())) {
                throw new IllegalStateException(root.path("message").asText("파이썬 스크립트 오류"));
            }

            recordSaver.saveRecords(jobId, root);

            job.markDone(
                    root.path("totalKwh").asDouble(),
                    root.path("estimatedBill").asDouble(),
                    root.path("forecastStart").asText(),
                    root.path("forecastEnd").asText()
            );
            jobRepository.save(job);
            log.info("예측 완료 — jobId={} totalKwh={}", jobId, job.getTotalKwh());

        } catch (Exception e) {
            log.error("예측 실패 — jobId={}: {}", jobId, e.getMessage());
            job.markFailed(e.getMessage());
            jobRepository.save(job);
        }
    }

    private String runPython(String csvText) throws IOException, InterruptedException {
        String python = findPython();
        String script = resolveScript();

        Process proc = new ProcessBuilder(python, script)
                .redirectErrorStream(false)
                .start();

        // stdin 전송 후 반드시 닫아야 Python이 EOF를 받음
        try (OutputStream os = proc.getOutputStream()) {
            os.write(csvText.getBytes(StandardCharsets.UTF_8));
        }

        // stdout/stderr 동시 소비 — 버퍼 포화 데드락 방지
        StringBuilder out = new StringBuilder();
        StringBuilder err = new StringBuilder();

        Thread t1 = new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8))) {
                br.lines().forEach(l -> out.append(l).append("\n"));
            } catch (IOException ignored) {}
        });
        Thread t2 = new Thread(() -> {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(proc.getErrorStream(), StandardCharsets.UTF_8))) {
                br.lines().forEach(l -> err.append(l).append("\n"));
            } catch (IOException ignored) {}
        });

        t1.start(); t2.start();
        boolean finished = proc.waitFor(10, TimeUnit.MINUTES);
        t1.join(); t2.join();

        if (!finished) { proc.destroyForcibly(); throw new IllegalStateException("Python 타임아웃 (10분)"); }
        if (!err.isEmpty()) log.debug("python stderr: {}", err);

        int exit = proc.exitValue();
        if (exit != 0) throw new IllegalStateException("파이썬 종료코드=" + exit + " stderr=" + err);

        String stdout = out.toString().trim();
        if (stdout.isBlank()) throw new IllegalStateException("파이썬 출력이 비어있습니다.");
        return stdout;
    }

    private String resolveScript() {
        URL res = getClass().getClassLoader().getResource("python/power_forecast.py");
        if (res != null) {
            try { return new File(res.toURI()).getAbsolutePath(); } catch (Exception ignored) {}
        }
        File rel = new File("src/main/resources/python/power_forecast.py");
        if (rel.exists()) return rel.getAbsolutePath();
        throw new IllegalStateException("power_forecast.py를 찾을 수 없습니다.");
    }

    private String findPython() {
        for (String cmd : new String[]{"python3", "python"}) {
            try {
                int exit = new ProcessBuilder(cmd, "--version").start().waitFor();
                if (exit == 0) return cmd;
            } catch (Exception ignored) {}
        }
        throw new IllegalStateException("Python이 설치되어 있지 않습니다.");
    }
}
