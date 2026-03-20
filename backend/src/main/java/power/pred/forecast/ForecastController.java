package power.pred.forecast;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/forecast")
@RequiredArgsConstructor
public class ForecastController {

    private final ForecastService forecastService;

    @PostMapping("/{buildingId}")
    public ResponseEntity<?> startForecast(@PathVariable Long buildingId) {
        Long jobId = forecastService.submitForecast(buildingId);
        return ResponseEntity.ok(Map.of(
                "jobId",      jobId,
                "buildingId", buildingId,
                "status",     "PENDING",
                "pollUrl",    "/forecast/job/" + jobId + "/status"
        ));
    }

    @GetMapping("/job/{jobId}/status")
    public ResponseEntity<?> getStatus(@PathVariable Long jobId) {
        ForecastJob job = forecastService.getJob(jobId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("jobId",      job.getId());
        res.put("buildingId", job.getBuildingId());
        res.put("status",     job.getStatus());
        res.put("createdAt",  job.getCreatedAt());
        res.put("finishedAt", job.getFinishedAt());
        if (job.getStatus() == ForecastJob.Status.DONE) {
            res.put("totalKwh",      job.getTotalKwh());
            res.put("estimatedBill", job.getEstimatedBill());
            res.put("forecastStart", job.getForecastStart());
            res.put("forecastEnd",   job.getForecastEnd());
        }
        if (job.getStatus() == ForecastJob.Status.FAILED) {
            res.put("errorMessage", job.getErrorMessage());
        }
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{buildingId}/latest")
    public ResponseEntity<?> getLatest(@PathVariable Long buildingId) {
        ForecastJob job = forecastService.getLatestJob(buildingId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("jobId",         job.getId());
        res.put("status",        job.getStatus());
        res.put("totalKwh",      job.getTotalKwh());
        res.put("estimatedBill", job.getEstimatedBill());
        res.put("forecastStart", job.getForecastStart());
        res.put("forecastEnd",   job.getForecastEnd());
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{buildingId}/hourly")
    public ResponseEntity<?> getHourly(@PathVariable Long buildingId) {
        List<Map<String, Object>> list = forecastService.getHourlyRecords(buildingId)
                .stream()
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("dt", r.getForecastDt());
                    m.put("kw", r.getPredictedKwh());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{buildingId}/monthly")
    public ResponseEntity<?> getMonthly(@PathVariable Long buildingId) {
        List<ForecastRecord> records = forecastService.getHourlyRecords(buildingId);

        Map<String, double[]> byMonth = new LinkedHashMap<>();
        for (ForecastRecord r : records) {
            String ym = r.getForecastDt().substring(0, 7);
            byMonth.computeIfAbsent(ym, k -> new double[]{0, 0, Double.MIN_VALUE});
            double[] s = byMonth.get(ym);
            s[0] += r.getPredictedKwh();
            s[1]++;
            if (r.getPredictedKwh() > s[2]) s[2] = r.getPredictedKwh();
        }

        List<Map<String, Object>> result = byMonth.entrySet().stream()
                .map(e -> {
                    double[] s = e.getValue();
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("yearMonth", e.getKey());
                    m.put("totalKwh",  Math.round(s[0] * 100.0) / 100.0);
                    m.put("avgKwh",    Math.round(s[0] / s[1] * 100.0) / 100.0);
                    m.put("peakKwh",   Math.round(s[2] * 100.0) / 100.0);
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
