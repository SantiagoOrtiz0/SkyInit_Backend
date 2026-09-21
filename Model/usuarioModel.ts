import { db } from "./conexion.ts";
import { usuarios, roles } from "./schema.ts";
import {eq, sql} from "drizzle-orm";

export interface UsuarioCreate {
    Nombre: string;
    Correo: string;
    Password: string;  // Ya hasheado
    Telefono?: string;
    RolID?: number; 
}

/**Busca un usuario por correo (para login y validar duplicados) */
export async function buscarPorCorreo(correo: string) {
    const resultado = await db.select({
        usuarioID: usuarios.usuarioID,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        telefono: usuarios.telefono,
        rolID: usuarios.rolID,
        nombreRol: roles.nombreRol,
        estadoCuenta: usuarios.estadoCuenta,
        fotoPerfil: usuarios.fotoPerfil,
        fechaRegistro: usuarios.fechaRegistro,
        contrasenaHash: usuarios.contrasenaHash,
        aceptoTerminos: usuarios.aceptoTerminos,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
    .where(eq(usuarios.correo, correo))
    .limit(1);

    return resultado[0]  ?? null;
}

/**Busca un usuario por ID - sin hash */
export async function buscarPorId(id: number) {
    const resultado = await db.select ({
        usuarioID: usuarios.usuarioID,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        telefono: usuarios.telefono,
        rolID: usuarios.rolID,
        nombreRol: roles.nombreRol,
        estadoCuenta: usuarios.estadoCuenta,
        fotoPerfil: usuarios.fotoPerfil,
        fechaRegistro: usuarios.fechaRegistro,
        contrasenaHash: usuarios.contrasenaHash,
        aceptoTerminos: usuarios.aceptoTerminos,     
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
    .where(eq(usuarios.usuarioID, id))
    .limit(1);

    return resultado[0] ?? null;
}

/**Verificar si un correo ya esta registrado */
export async function correoExiste(correo: string): Promise<boolean> {
    const resultado = await db
    .select({total: sql<number>`COUNT(*)`})
    .from(usuarios)
    .where(eq(usuarios.correo, correo));

    return Number (resultado[0].total) > 0;
}

/**Crear un nuevo usuario */
export async function crearUsuario(data: UsuarioCreate): Promise<number> {
    const resultado = await db.insert(usuarios).values({
        nombre: data.Nombre,
        correo: data.Correo,
        contrasenaHash: data.Password,
        telefono: data.Telefono ?? null,
        rolID: data.RolID ?? 5,
        estadoCuenta: "Activa",
        aceptoTerminos: 0,
    });

    return Number(resultado[0].insertId);
}

/**Marcar la aceptacion de terminos del usuario */
export async function aceptarTerminos(usuarioId: number): Promise<void> {
    await db
    .update(usuarios)
    .set({
        aceptoTerminos: 1,
        fechaAceptacionTerminos: sql`NOW()`,
    })
    .where(eq(usuarios.usuarioID, usuarioId));
}