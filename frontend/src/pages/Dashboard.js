import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Stack,
  Container,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Add Reconciliation', path: '/reconciliation/add' },
    { label: 'Edit Reconciliation', path: '/reconciliation/edit' },
    { label: 'As-of Check', path: '/reconciliation/check' },
    { label: 'Search Data', path: '/reconciliation/search' },
    { label: 'Duplicate Check', path: '/reconciliation/duplicates' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const goTo = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: '#3f51b5' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Team-SAP Dashboard
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Welcome, {localStorage.getItem('username') || 'User'} 👋
          </Typography>
          <Typography variant="body1" mb={3}>
            Choose an action below to continue working on Project-SAP:
          </Typography>

          <Stack spacing={2} direction="column" alignItems="center">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant="contained"
                color="primary"
                size="large"
                sx={{ minWidth: 300 }}
                onClick={() => goTo(item.path)}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default Dashboard;