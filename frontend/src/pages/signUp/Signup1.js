import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup1.css';

const Signup1 = () => {
    const navigate = useNavigate();

    return (
        <div className="signup1">
            <div className="overlap-wrapper">
                <div className="overlap">
                    <div className="signup-title-text">회원가입 (1/2)</div>
                    <div className="choose-text">어떤 계정을 생성할까요?</div>
                    <div className="admin-button">
                        <button className="overlap-group" type="button"
                            onClick={() => navigate('/signup2', { state: { isAdmin: true } })}>
                            <div className="admin-button-text">저는 관리자입니다.</div>
                        </button>
                    </div>
                    <div className="user-button">
                        <button className="overlap-group" type="button"
                            onClick={() => navigate('/signup2', { state: { isAdmin: false } })}>
                            <div className="user-button-text">저는 일반 사용자입니다.</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup1;
