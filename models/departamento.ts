import Sql = require("../infra/sql");
import DataUtil = require("../utils/dataUtil");

export = class Departamento {
	public id_departamento: number;
	public desc_departamento: string;
	
	public static  validar(departamento: Departamento): string{
		if (!departamento)
			return "Dados inválidos";

		departamento.desc_departamento = (departamento.desc_departamento || "").normalize().trim();
		if (departamento.desc_departamento.length < 2 || departamento.desc_departamento.length > 45)
			return "Nome do departamento inválido";

		return null;
	}

	public static async listar(): Promise<Departamento[]>{
		let lista: Departamento[] = null;
		await Sql.conectar(async (sql) =>{
			lista = await sql.query("select id_departamento, desc_departamento from departamento order by desc_departamento");
		});
		return lista;
	}

	public static async criar(departamento: Departamento): Promise<string>{
		let erro: string = Departamento.validar(departamento);

		if(erro){
			return erro;
		}

		await Sql.conectar(async(sql)=>{
			try {
				await sql.query("insert into departamento (desc_departamento) values (?)",[departamento.desc_departamento]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					erro = `O departamento ${departamento.desc_departamento} já existe`;
				else
					throw e;
			}
		});

		return erro;
	} 

	public static async obter(id_departamento:number): Promise<Departamento>{
		let departamento: Departamento = null;

		await Sql.conectar(async(sql)=>{
			let lista: Departamento[] = await sql.query("select id_departamento, desc_departamento from departamento where id_departamento = ?",[id_departamento]);
		 
			if(lista && lista.length){
				departamento = lista[0];
			}
		});

		return departamento;

	}

	public static async alterar(departamento: Departamento): Promise<string>{
		let erro: string = Departamento.validar(departamento);

		if(erro){
			return erro;
		}

		await Sql.conectar(async(sql)=>{
			try {
				await sql.query("update departamento set desc_departamento = ? where id_departamento = ?",[departamento.desc_departamento, departamento.id_departamento]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					erro = `O departamento ${departamento.desc_departamento} já existe`;
				else
					throw e;
			}
		});

		return erro;
	}

	public static async excluir(id_departamento:number): Promise<string>{
		let erro: string = null;

		await Sql.conectar(async(sql)=>{
			try {
				await sql.query("delete from departamento where id_departamento=?;",[id_departamento]);
				if (!sql.linhasAfetadas)
					erro = "Departamento não encontrado";
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_ROW_IS_REFERENCED":
						case "ER_ROW_IS_REFERENCED_2":
							erro = "O departamento não pode ser excluído porque pertence a um ou mais eventos ou usuários";
							return;
					}
				}
				throw e;
			}
		});
		return erro;
	}
}
