import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import './Signup2.css';

const Signup2 = () => {
    const [id, setId]           = useState('');
    const [pw, setPw]           = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state) setIsAdmin(location.state.isAdmin);
    }, [location.state]);

    const submit = () => {
        if (!id || !pw) { alert('아이디와 비밀번호를 모두 입력해주세요.'); return; }
        api.post('/account/sign-up', { id, pw, isAdmin })
            .then(() => { alert('회원가입이 완료되었습니다.'); navigate('/'); })
            .catch(err => alert(err.response?.data?.error || '회원가입에 실패했습니다.'));
    };

    return (
        <div className="signup2">
            <div className="overlap-wrapper">
                <div className="overlap">
                    <div className="signup-title-text">회원가입 (2/2)</div>
                    <input className="id-input" type="text" value={id}
                        onChange={e => setId(e.target.value)} placeholder="아이디를 입력하세요." />
                    <input className="pw-input" type="password" value={pw}
                        onChange={e => setPw(e.target.value)} placeholder="비밀번호를 입력하세요." />
                    <div className="signup-button">
                        <button className="overlap-group" type="button" onClick={submit}>
                            <div className="signup-button-text">계정 만들기</div>
                        </button>
                    </div>
                    <div className="login-button-text" onClick={() => navigate('/')}>로그인</div>
                </div>
            </div>
        </div>
    );
};

export default Signup2;
