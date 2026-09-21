import { query, execute } from "./conexion.ts";

export interface usuario {
    UsuarioID: number;
    Nombre: string;
    Correo: string;
    Telefono: string | null;
    RolID: number;
    NombreRol: string;
    EstadoCuenta: string;
    FotoPerfil: string | null;
    FechaRegistro: string;
    AceptoTerminos: number; 
}

export interface UsuarioCreate {
    Nombre: string;
    Correo: string;
    Password: string;  // Ya hasheado
    Telefono?: string;
    RolID?: number; 
}

//**Busca un usuario por correo (para login y validar duplicados) */
export async function buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const rows = await query<Usuario & {ContraseñaHash: string}>(
    )
}