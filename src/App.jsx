import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CertificateView from './pages/CertificateView'
import { Toaster } from "@/components/ui/sonner"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/certificates/:id" element={<CertificateView />} />
            </Routes>
            <Toaster />
        </BrowserRouter>
    )
}

export default App
