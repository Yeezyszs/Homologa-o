import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/ui/hooks/useAuth'
import { RotaProtegida } from '@/ui/components/RotaProtegida'
import { Layout } from '@/ui/components/Layout'
import { Login } from '@/ui/pages/Login'
import { Dashboard } from '@/ui/pages/Dashboard'
import { Fornecedores } from '@/ui/pages/Fornecedores'
import { FornecedorForm } from '@/ui/pages/FornecedorForm'
import { FornecedorDetalhe } from '@/ui/pages/FornecedorDetalhe'
import { Segmentos } from '@/ui/pages/Segmentos'
import { Catalogo } from '@/ui/pages/Catalogo'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/fornecedores/novo" element={<FornecedorForm />} />
            <Route path="/fornecedores/:id" element={<FornecedorDetalhe />} />
            <Route path="/fornecedores/:id/editar" element={<FornecedorForm />} />
            <Route path="/segmentos" element={<Segmentos />} />
            <Route path="/catalogo" element={<Catalogo />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
