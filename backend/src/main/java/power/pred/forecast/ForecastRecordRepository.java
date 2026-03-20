package power.pred.forecast;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ForecastRecordRepository extends JpaRepository<ForecastRecord, Long> {

    List<ForecastRecord> findByJobIdOrderByForecastDtAsc(Long jobId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ForecastRecord r WHERE r.jobId = :jobId")
    void deleteByJobId(Long jobId);
}
