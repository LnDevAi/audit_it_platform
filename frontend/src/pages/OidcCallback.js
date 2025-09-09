import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';

const OidcCallback = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    if (token) {
      Cookies.set('auth_token', token, { expires: 1 });
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [search, navigate]);

  return <div>Connexion SSO en cours...</div>;
};

export default OidcCallback;

