package power.pred.forecast;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForecastJobRepository extends JpaRepository<ForecastJob, Long> {
    Optional<ForecastJob> findTopByBuildingIdOrderByCreatedAtDesc(Long buildingId);
}
