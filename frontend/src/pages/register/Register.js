import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import './Register.css';

import ButtonArrow  from '../../img/button-arrow.js';
import TopmenuLine  from '../../img/topmenu-line.js';
import SidemenuLine from '../../img/sidemenu-line.js';
import UserImg      from '../../img/user-img.js';

const Register = () => {
    const [id, setId]             = useState('');
    const [isAdmin, setIsAdmin]   = useState(false);
    const [bname, setBname]       = useState('');
    const [file, setFile]         = useState(null);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);

    const fileInput = useRef();
    const navigate  = useNavigate();
    const location  = useLocation();

    useEffect(() => {
        if (location.state) {
            setId(location.state.id);
            setIsAdmin(location.state.isAdmin);
        }
    }, [location.state]);

    const nav = (path) => navigate(path, { state: { id, isAdmin } });

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setFileName(f.name);
    };

    const handleFileDelete = () => {
        setFile(null);
        setFileName('');
        fileInput.current.value = '';
    };

    const handleUpload = () => {
        if (!bname.trim()) { alert('건물명을 입력해주세요.'); return; }
        if (!file)         { alert('CSV 파일을 선택해주세요.'); return; }

        const formData = new FormData();
        formData.append('userId', id);
        formData.append('buildingName', bname);
        formData.append('csv', file);

        setUploading(true);
        api.post('/building/upload', formData)
            .then(() => {
                alert('데이터가 성공적으로 업로드되었습니다.');
                setBname('');
                handleFileDelete();
            })
            .catch(err => alert(err.response?.data?.error || '업로드에 실패했습니다.'))
            .finally(() => setUploading(false));
    };

    return (
        <div className="register">
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
                                <div className="ret-button" onClick={() => nav(isAdmin ? '/retrieve/admin' : '/retrieve/user')}>
                                    <div className="text-wrapper-2">데이터 조회하기</div>
                                    <ButtonArrow className="img" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="title">데이터 등록</div>
                    <div className="building-input-form">
                        <input className="building-input" type="text" value={bname}
                            onChange={e => setBname(e.target.value)} placeholder="건물명을 입력하세요." />
                        <div className="text-wrapper-3">건물명</div>
                    </div>
                    <div className="file-input-form">
                        <input ref={fileInput} type="file" accept=".csv"
                            onChange={handleFileChange} style={{ display: 'none' }} />
                        <div className="file-input">{fileName}</div>
                        <div className="text-wrapper-3">파일 첨부</div>
                    </div>
                    <div className="file-button" onClick={() => fileInput.current.click()}>
                        <div className="file-button-text-wrapper">
                            <div className="file-button-text">파일 선택</div>
                        </div>
                    </div>
                    <div className="file-delete-button" onClick={handleFileDelete}>
                        <div className="file-button-text-wrapper">
                            <div className="file-button-text">파일 삭제</div>
                        </div>
                    </div>
                    <div className="submit-button" style={{ opacity: uploading ? 0.6 : 1 }}
                        onClick={uploading ? null : handleUpload}>
                        <div className="submit-button-text-wrapper">
                            <div className="submit-button-text">{uploading ? '업로드 중...' : '데이터 업로드'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
