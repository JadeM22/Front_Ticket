import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { InicioRedirect } from './InicioRedirect'
import { RequireAuth } from '../auth/RequireAuth'
import { RequirePasswordOk } from '../auth/RequirePasswordOk'
import { RequireRole } from '../auth/RequireRole'
import { LoginPage } from '../auth/LoginPage'
import { CambiarPasswordPage } from '../auth/CambiarPasswordPage'
import { RestablecerPasswordPage } from '../auth/RestablecerPasswordPage'
import { EmpleadoDashboard } from '../pages/empleado/Dashboard'
import { NuevaSolicitudPage } from '../pages/empleado/NuevaSolicitud'
import { EmpleadoSolicitudesPage } from '../pages/empleado/Solicitudes'
import { DisenadorDashboard } from '../pages/disenador/Dashboard'
import { JefeDashboard } from '../pages/jefe/Dashboard'
import { AdminDashboard } from '../pages/admin/Dashboard'
import { AdminUsuariosPage } from '../pages/admin/Usuarios'
import { AdminCatalogosPage } from '../pages/admin/Catalogos'
import { AdminBitacoraPage } from '../pages/admin/Bitacora'
import { TicketDetailPage } from '../pages/TicketDetail'
import { NotFoundPage } from '../pages/NotFound'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/restablecer-password', element: <RestablecerPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/cambiar-password', element: <CambiarPasswordPage /> },
      {
        element: <RequirePasswordOk />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <InicioRedirect /> },
              { path: '/tickets/:id', element: <TicketDetailPage /> },
              {
                element: <RequireRole roles={['Empleado']} />,
                children: [
                  { path: '/empleado', element: <EmpleadoDashboard /> },
                  { path: '/empleado/nueva', element: <NuevaSolicitudPage /> },
                  { path: '/empleado/solicitudes', element: <EmpleadoSolicitudesPage /> },
                ],
              },
              {
                element: <RequireRole roles={['Diseñador']} />,
                children: [{ path: '/disenador', element: <DisenadorDashboard /> }],
              },
              {
                element: <RequireRole roles={['Jefe de Área']} />,
                children: [{ path: '/jefe', element: <JefeDashboard /> }],
              },
              {
                element: <RequireRole roles={['Administrador']} />,
                children: [
                  { path: '/admin', element: <AdminDashboard /> },
                  { path: '/admin/usuarios', element: <AdminUsuariosPage /> },
                  { path: '/admin/catalogos', element: <AdminCatalogosPage /> },
                  { path: '/admin/bitacora', element: <AdminBitacoraPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
