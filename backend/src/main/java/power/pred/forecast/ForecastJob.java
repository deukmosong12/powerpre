package power.pred.forecast;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class ForecastJob {

    public enum Status { PENDING, RUNNING, DONE, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long   buildingId;

    @Enumerated(EnumType.STRING)
    private Status status;

    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;

    private Double totalKwh;
    private Double estimatedBill;
    private String forecastStart;
    private String forecastEnd;

    @Column(length = 1000)
    private String errorMessage;

    public ForecastJob(Long buildingId) {
        this.buildingId = buildingId;
        this.status     = Status.PENDING;
        this.createdAt  = LocalDateTime.now();
    }

    public void markRunning() { this.status = Status.RUNNING; }

    public void markDone(double kwh, double bill, String start, String end) {
        this.status        = Status.DONE;
        this.totalKwh      = kwh;
        this.estimatedBill = bill;
        this.forecastStart = start;
        this.forecastEnd   = end;
        this.finishedAt    = LocalDateTime.now();
    }

    public void markFailed(String reason) {
        this.status       = Status.FAILED;
        this.errorMessage = reason;
        this.finishedAt   = LocalDateTime.now();
    }
}
