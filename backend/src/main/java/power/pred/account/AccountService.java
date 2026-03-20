package power.pred.account;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public Account signUp(String id, String rawPw, Boolean isAdmin) {
        if (accountRepository.existsById(id)) {
            throw new IllegalStateException("이미 사용 중인 아이디입니다: " + id);
        }
        String hashed = passwordEncoder.encode(rawPw);
        Account account = new Account(id, hashed, isAdmin != null && isAdmin);
        return accountRepository.save(account);
    }

    public Account signIn(String id, String rawPw) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이디입니다."));
        if (!passwordEncoder.matches(rawPw, account.getPw())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다.");
        }
        return account;
    }
}
