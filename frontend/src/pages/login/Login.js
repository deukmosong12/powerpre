import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import './Login.css';

const Login = () => {
    const [id, setId] = useState('');
    const [pw, setPw] = useState('');
    const navigate = useNavigate();

    const login = () => {
        if (!id || !pw) { alert('아이디와 비밀번호를 입력해주세요.'); return; }
        api.post('/account/sign-in', { id, pw })
            .then(res => navigate('/home', { state: { id: res.data.id, isAdmin: res.data.isAdmin } }))
            .catch(() => alert('아이디 또는 비밀번호가 올바르지 않습니다.'));
    };

    return (
        <div className="login">
            <div className="overlap-wrapper">
                <div className="overlap">
                    <div className="login-title-text">⚡️전력 예측 시스템⚡️</div>
                    <input className="id-input" type="text" value={id}
                        onChange={e => setId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && login()}
                        placeholder="아이디를 입력하세요." />
                    <input className="pw-input" type="password" value={pw}
                        onChange={e => setPw(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && login()}
                        placeholder="비밀번호를 입력하세요." />
                    <div className="login-button">
                        <div className="overlap-group" onClick={login}>
                            <div className="login-button-text">로그인</div>
                        </div>
                    </div>
                    <div className="signup-button-text" onClick={() => navigate('/signup1')}>회원가입</div>
                </div>
            </div>
        </div>
    );
};

export default Login;
