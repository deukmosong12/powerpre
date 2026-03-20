import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../api';
import './RetrieveAdmin.css';

import ButtonArrow  from '../../../img/button-arrow.js';
import TopmenuLine  from '../../../img/topmenu-line.js';
import SidemenuLine from '../../../img/sidemenu-line.js';
import UserImg      from '../../../img/user-img.js';

const RetrieveAdmin = () => {
    const [id, setId]               = useState('');
    const [isAdmin, setIsAdmin]     = useState(false);
    const [buildings, setBuildings] = useState([]);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state) {
            setId(location.state.id);
            setIsAdmin(location.state.isAdmin);
        }
    }, [location.state]);

    useEffect(() => {
        if (!id) return;
        api.get(`/building/list?userId=${id}`)
            .then(res => setBuildings(res.data))
            .catch(() => alert('데이터를 불러오는데 실패했습니다.'));
    }, [id]);

    const nav = (path) => navigate(path, { state: { id, isAdmin } });

    return (
        <div className="retrieve-admin">
            <div className="overlap-wrapper">
                <div className="overlap">
                    <div className="overlap-group">
                        <div className="topmenu">
                            <div className="div">
                                <div className="text-wrapper">{id} 님</div>
                                <div className="logout-button" onClick={() => navigate('/')}>로그아웃</div>
                                <TopmenuLine className="topmenu-line" />
                                <UserImg className="user-img" />
                            </div>
                        </div>
                        <div className="sidemenu">
                            <div className="overlap-2">
                                <div className="home-button" onClick={() => nav('/home')}>⚡️전력 예측 시스템⚡️</div>
                                <SidemenuLine className="sidemenu-line" />
                                <div className="reg-button" onClick={() => nav('/register')}>
                                    <div className="text-wrapper-2">데이터 등록하기</div>
                                    <ButtonArrow className="img" />
                                </div>
                                <div className="ret-button" onClick={() => nav('/retrieve/admin')}>
                                    <div className="text-wrapper-2">데이터 조회하기</div>
                                    <ButtonArrow className="img" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="upload-title">등록된 건물 목록</div>
                    <div className="download-file-table">
                        {buildings.length === 0
                            ? <p className="empty-msg">등록된 건물이 없습니다.</p>
                            : buildings.map(b => (
                                <div key={b.id} className="file-row">
                                    <span className="file-name">{b.name}</span>
                                    <span className="file-user">{b.userId}</span>
                                </div>
                            ))
                        }
                    </div>

                    <div className="upload-button" onClick={() => nav('/register')}>
                        <div className="div-wrapper">
                            <div className="text-wrapper-3">데이터 업로드</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetrieveAdmin;
