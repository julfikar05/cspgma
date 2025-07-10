import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

function LoginPage({ setAuth }) {
  const navigate = useNavigate();

  // State for form inputs
  const [form, setForm] = useState({ username: '', password: '' });

  // State for errors and password visibility
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle field changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle Enter key on password input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin(); // trigger login on Enter key
    }
  };

  // Handle login function
  const handleLogin = async () => {
    if (!form.username || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const res = await axios.post('/login', form);
      if (res.data.success) {
        localStorage.setItem('auth', 'true');
        localStorage.setItem('username', form.username);
        setAuth(true);
        navigate('/dashboard');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Login failed. Check server connection.');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f8f9fc' }}>
      {/* Left panel with SAP logo (hidden on small screens) */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#f3f4fa',
          display: { xs: 'none', md: 'flex' },
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/2560px-SAP_2011_logo.svg.png"
          alt="SAP Logo"
          style={{ width: '80%', maxWidth: 400 }}
        />
      </Box>

      {/* Right panel with form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 4,
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Welcome to <span style={{ color: '#3f51b5' }}>Team-SAP</span>
          </Typography>

          <Typography variant="body2" mb={2}>
            Please sign-in to your account and start the adventure
          </Typography>

          {/* Show error messages */}
          {error && (
            <Typography color="error" mb={2}>
              {error}
            </Typography>
          )}

          {/* Username Input */}
          <TextField
            label="Username"
            variant="outlined"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            autoFocus
          />

          {/* Password Field with toggle visibility */}
          <TextField
            label="Password"
            variant="outlined"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            fullWidth
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Submit Button */}
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2, backgroundColor: '#3f51b5' }}
            onClick={handleLogin}
          >
            SIGN IN
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

export default LoginPage;