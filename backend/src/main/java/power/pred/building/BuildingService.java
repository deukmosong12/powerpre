package power.pred.building;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import power.pred.forecast.ForecastService;
import power.pred.power.PowerService;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class BuildingService {

    private final BuildingRepository buildingRepository;
    private final PowerService       powerService;
    private final ForecastService    forecastService;

    @Transactional
    public Map<String, Object> uploadAndForecast(String userId, String buildingName, MultipartFile csv) throws Exception {
        byte[] csvBytes = csv.getBytes();

        Building building = new Building(null, buildingName, userId, csvBytes);
        buildingRepository.save(building);
        log.info("건물 등록 — id={} name={}", building.getId(), buildingName);

        powerService.saveCsvToDB(building.getId(), csvBytes);
        Long jobId = forecastService.submitForecast(building.getId());

        return Map.of(
                "buildingId", building.getId(),
                "jobId",      jobId,
                "message",    "업로드 완료. 예측이 백그라운드에서 시작되었습니다."
        );
    }

    public List<Building> findByUser(String userId) {
        return buildingRepository.findByUserId(userId);
    }
}
