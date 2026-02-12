import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import CertificateView from './pages/CertificateView'
import ProtectedRoute from './components/ProtectedRoute'
import Participants from './pages/Participants'
import { Toaster } from "@/components/ui/sonner"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/participants"
                    element={
                        <ProtectedRoute>
                            <Participants />
                        </ProtectedRoute>
                    }
                />
                <Route path="/certificates/:id" element={<CertificateView />} />
            </Routes>
            <Toaster />
        </BrowserRouter>
    )
}

export default App
