package power.pred.power;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PowerRepository extends JpaRepository<Power, Long> {
    List<Power> findByBuildingIdOrderByDateTime(Long buildingId);
}
