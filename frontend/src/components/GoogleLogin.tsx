// GoogleLogin.tsx
import { GoogleLogin } from '@react-oauth/google';

const GoogleLoginComponent = () => {
  return (
    <div style={{ margin: '20px' }}>
      <h2>Login with Google</h2>
      <GoogleLogin
        onSuccess={credentialResponse => {
          console.log(credentialResponse); // Guarda token
        }}
        onError={() => {
          console.log('Login Failed');
        }}
      />
    </div>
  );
}

export default GoogleLoginComponent;