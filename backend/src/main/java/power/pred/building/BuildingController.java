package power.pred.building;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/building")
@RequiredArgsConstructor
@Slf4j
public class BuildingController {

    private final BuildingService buildingService;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam String userId,
            @RequestParam String buildingName,
            @RequestPart  MultipartFile csv) throws Exception {

        Map<String, Object> result = buildingService.uploadAndForecast(userId, buildingName, csv);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/list")
    public ResponseEntity<List<Building>> list(@RequestParam String userId) {
        return ResponseEntity.ok(buildingService.findByUser(userId));
    }
}
