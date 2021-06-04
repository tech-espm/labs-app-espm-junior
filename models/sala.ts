import Sql = require("../infra/sql");
import DataUtil = require("../utils/dataUtil");

export = class Sala {
	public id_sala: number;
	public desc_sala: string;
	
	public static  validar(sala: Sala): string{
		if(!sala){
			return "Dados inválidos";
		}
		if(!sala.desc_sala || sala.desc_sala.length>45){
			return "Descrição inválida";
		}
		
		return null;
	}

	public static async listar(): Promise<Sala[]>{
        let lista: Sala[] = null;
        await Sql.conectar(async (sql) =>{
            lista = await sql.query("select id_sala, desc_sala from sala");
        });
        return lista;
	}

	public static async criar(sala: Sala): Promise<string>{
        let erro: string = Sala.validar(sala);

        if(erro){
            return erro;
        }

        await Sql.conectar(async(sql)=>{
            let lista = await sql.query("insert into sala (desc_sala) values (?)",[sala.desc_sala]);
        });

        return erro;
    } 

	public static async obter(id_sala:number): Promise<Sala>{
        let sala: Sala = null;

        await Sql.conectar(async(sql)=>{
            let lista = await sql.query("select id_sala, desc_sala from sala where id_sala = ?",[id_sala]);
         
            if(lista && lista.length){
                sala = lista[0];
            }
        });

        return sala;

    }

	public static async alterar(sala: Sala): Promise<string>{
        let erro: string = Sala.validar(sala);

        if(erro){
            return erro;
        }

        await Sql.conectar(async(sql)=>{
            let lista = await sql.query("update sala set desc_sala = ? where id_sala = ?",[sala.desc_sala, sala.id_sala]);
        });

        return erro;
    }

	public static async excluir(id_sala:number): Promise<string>{
        let erro: string = null;

        await Sql.conectar(async(sql)=>{
            let lista = await sql.query("delete from sala where id_sala=?;",[id_sala]);
         
            if(!sql.linhasAfetadas){
                erro = 'Sala não encontrada';
            }
        });

        return erro;

    }
}
