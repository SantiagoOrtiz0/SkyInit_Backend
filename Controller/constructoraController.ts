import { Constructora } from "../Model/constructoraModel.ts";
import { Context,RouterContext } from "../Dependencies/dependencias.ts";

export const getConstructoras = async (ctx:Context) => {

    const {response} = ctx

    try {

        const constructora = new Constructora();
        const lista = await constructora.SeleccionarConstructoras();

        response.status = 200;
        response.body = {
            success:true,
            data:lista,
        };
        
    } catch (error) {
        console.error("ERROR AL LISTAR CONSTRUCTORAS:" , error);
        response.status = 500;
        response.body={
            success: false,
            message: "Error al listar constructoras"
        }
        
    };


};

export const getConstructorasporId = async (ctx:RouterContext<string>) => {

    const {response,params} = ctx

    try {

        const id = Number(params.id);
        if (isNaN (id)){
            response.status = 400;
            response.body = {
                success: false,
                mensaje: "El ID de la constructora no es válido",
            };
            return;
        }


        const constructora = new Constructora(null, id);
        const data = await constructora.SeleccionarConstructoraporId();


        if (!data) {
        response.status = 404;
        response.body = {
            success: false,
            message: "Constructora no encontrada",
        };
        return;
    }

        response.status = 200;
        response.body = {
            success:true,
            data
        };
        
    } catch (error) {
            console.error("ERROR AL OBTENER CONSTRUCTORA:", error);
            response.status = 500;
            response.body = {
            success: false,
            message: "Error al obtener la constructora",
            };
    }

};

export const postConstructora = async (ctx:Context)=>{


    const {response, request}= ctx;

    try {

        if (!request.hasBody) {
            response.status = 400;
            response.body = {
                success : false,
                message : "el cuerpo de la peticion esta vacio"

            };
            return;
        }

        const body = await request.body.json();
        const {nombre,descripcion,contacto,telefono,correo,estado,logo,ciudad,inmobiliariaID,usuarioID,} = body;


        if (!nombre || !descripcion) {
            response.status = 400;
            response.body = {
                success: false,
                message: "nombre y descripcion son obligatorios",
            };
            return;
        }

        const constructora = new Constructora({nombre,descripcion,contacto,telefono,correo,estado,logo,ciudad,inmobiliariaID,usuarioID,});

        await constructora.CrearConstructora();


        await constructora.CrearConstructora();

        response.status = 201;
        response.body = {
            success: true,
            mensaje: "Constructora creada correctamente",
        };



    } catch (error) {

        console.error("ERROR AL CREAR CONSTRUCTORA:", error);
        response.status = 500;
        response.body = {
            success: false,
            mensaje: "Error al crear la constructora",
    };
    }
}

export const putConstructora = async (ctx: RouterContext<string>)=>{
    
    const {response,params,request}= ctx;
    try {
        const id = Number(params.id);

        if (isNaN(id)) {
        response.status = 400;
        response.body = {
            success: false,
            mensaje: "El ID de la constructora no es válido",
        };
        return;
        }

        const body = await request.body.json();
        const {
        nombre,
        descripcion,
        contacto,
        telefono,
        correo,
        estado,
        logo,
        ciudad,
        inmobiliariaID,
        usuarioID,
        } = body;

        const constructora = new Constructora(
        {
            constructoraID: id,
            nombre,
            descripcion,
            contacto,
            telefono,
            correo,
            estado,
            logo,
            ciudad,
            inmobiliariaID,
            usuarioID,
        },
        id,
        );

        const resultado = await constructora.ActualizarConstructora();

        if (!resultado) {
        response.status = 404;
        response.body = {
            success: false,
            message: "Constructora no encontrada",
        };
        return;
        }

        response.status = 200;
        response.body = {
            success: true,
            message: "Constructora actualizada correctamente",
        };
    } catch (error) {
        console.error("ERROR AL ACTUALIZAR CONSTRUCTORA:", error);
        response.status = 500;
        response.body = {
            success: false,
            message: "Error al actualizar la constructora",
        };
    }
}

export const deleteConstructora = async (ctx: RouterContext<string>) => {
    const { response, params } = ctx;

    try {
        const id = Number(params.id);

        if (isNaN(id)) {
        response.status = 400;
        response.body = {
            success: false,
            message: "El ID de la constructora no es válido",
        };
        return;
        }

        const constructora = new Constructora(null, id);
        const resultado = await constructora.EliminarConstructora();

        if (!resultado) {
        response.status = 404;
        response.body = {
            success: false,
            message: "Constructora no encontrada",
        };
        return;
        }

        response.status = 200;
        response.body = {
        success: true,
        message: "Constructora eliminada correctamente",
        };
    } catch (error) {
        console.error("ERROR AL ELIMINAR CONSTRUCTORA:", error);
        response.status = 500;
        response.body = {
        success: false,
        message: "Error al eliminar la constructora",
        };
    }
};
