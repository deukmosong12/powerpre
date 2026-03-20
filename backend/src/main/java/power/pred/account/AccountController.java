package power.pred.account;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping("/sign-up")
    public ResponseEntity<?> signUp(@RequestBody Map<String, Object> body) {
        try {
            String  id      = (String)  body.get("id");
            String  pw      = (String)  body.get("pw");
            Boolean isAdmin = body.get("isAdmin") != null && (Boolean) body.get("isAdmin");
            Account account = accountService.signUp(id, pw, isAdmin);
            return ResponseEntity.ok(Map.of("id", account.getId(), "isAdmin", account.getIsAdmin()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/sign-in")
    public ResponseEntity<?> signIn(@RequestBody Map<String, String> body) {
        try {
            Account account = accountService.signIn(body.get("id"), body.get("pw"));
            return ResponseEntity.ok(Map.of("id", account.getId(), "isAdmin", account.getIsAdmin()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
