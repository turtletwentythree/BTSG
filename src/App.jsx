import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './store.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import AllTypeRequest from './pages/AllTypeRequest.jsx';
import CreateRequest from './pages/CreateRequest.jsx';
import AllRequest from './pages/AllRequest.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import TrackingList from './pages/TrackingList.jsx';
import EditRequest from './pages/EditRequest.jsx';

function Protected({ children }) {
  const { user, loading } = useApp();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<AllRequest />} />
        <Route path="/all-type-request" element={<AllTypeRequest />} />
        <Route path="/summary-request/:code" element={<RequestDetail />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/requests/:id/edit" element={<EditRequest />} />
        <Route path="/request-form/:code" element={<TrackingList />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-requests" element={<CreateRequest />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
