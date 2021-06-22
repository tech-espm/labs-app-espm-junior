CREATE DATABASE IF NOT EXISTS espmjunior DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE espmjunior;

-- DROP TABLE IF EXISTS tokenqr;
CREATE TABLE tokenqr (
  token char(64) NOT NULL,
  qr1 char(16) NOT NULL,
  qr2 char(16) NOT NULL
);

INSERT INTO tokenqr (token, qr1, qr2) VALUES ('', '', '');

-- DROP TABLE IF EXISTS perfil;
CREATE TABLE perfil (
  idperfil int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idperfil),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO perfil (nome) VALUES ('Administrador'), ('Comum');

-- DROP TABLE IF EXISTS cargo;
CREATE TABLE cargo (
  idcargo int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idcargo),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO cargo (nome) VALUES ('Administrador'), ('RH'), ('Financeiro');

-- DROP TABLE IF EXISTS curso;
CREATE TABLE curso (
  idcurso int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idcurso),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO curso (nome) VALUES ('Nenhum'), ('ADM'), ('RI'), ('PP'), ('CISO'), ('TECH');

-- DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  idusuario int NOT NULL AUTO_INCREMENT,
  login varchar(100) NOT NULL,
  nome varchar(100) NOT NULL,
  idperfil int NOT NULL,
  versao int NOT NULL,
  token char(32) DEFAULT NULL,
  idcargo int NOT NULL,
  idcurso int NOT NULL,
  semestre int NOT NULL,
  endereco varchar(100) NOT NULL,
  telefone varchar(20) NOT NULL,
  nascimento datetime NOT NULL,
  senhaqr varchar(100) NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (idusuario),
  UNIQUE KEY login_UN (login),
  KEY usuario_idperfil_FK_idx (idperfil),
  KEY usuario_idcargo_FK_idx (idcargo),
  KEY usuario_idcurso_FK_idx (idcurso),
  CONSTRAINT usuario_idperfil_FK FOREIGN KEY (idperfil) REFERENCES perfil (idperfil) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT usuario_idcargo_FK FOREIGN KEY (idcargo) REFERENCES cargo (idcargo) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT usuario_idcurso_FK FOREIGN KEY (idcurso) REFERENCES curso (idcurso) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO usuario (login, nome, idperfil, versao, token, idcargo, idcurso, semestre, endereco, telefone, nascimento, criacao) VALUES ('admin@espm.br', 'Administrador', 1, 0, NULL, 1, 1, 1, '', '', NOW(), NOW());

-- DROP TABLE IF EXISTS dayoff;
CREATE TABLE dayoff (
  iddayoff int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  ano smallint NOT NULL,
  semestre tinyint NOT NULL,
  data datetime NOT NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (iddayoff),
  KEY dayoff_ano_semestre_idusuario_idx (ano, semestre, idusuario),
  KEY dayoff_idusuario_FK_idx (idusuario),
  CONSTRAINT dayoff_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS ficha_medica;
CREATE TABLE ficha_medica (
  idusuario int NOT NULL,
  tipo_sanguineo varchar(5) NOT NULL,
  alergia varchar(100) NOT NULL,
  plano_saude varchar(50) NOT NULL,
  contato_emergencia varchar(20) NOT NULL,
  hospital_preferencia varchar(50) NOT NULL,
  PRIMARY KEY (idusuario),
  CONSTRAINT ficha_medica_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO ficha_medica (idusuario, tipo_sanguineo, alergia, plano_saude, contato_emergencia, hospital_preferencia) VALUES (1, '', '', '', '', '');

-- DROP TABLE IF EXISTS ponto;
CREATE TABLE ponto (
  idponto int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  entrada datetime NOT NULL,
  saida datetime NULL,
  PRIMARY KEY (idponto),
  KEY idusuario_FK_idx (idusuario),
  CONSTRAINT ponto_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE evento (
  id_evento int NOT NULL AUTO_INCREMENT,
  nome_evento varchar(100) NOT NULL,
  desc_evento varchar(100) NOT NULL,
  inicio_evento datetime NOT NULL,
  termino_evento datetime NOT NULL,
  PRIMARY KEY (id_evento),
  KEY evento_inicio_termino_ix (inicio_evento, termino_evento),
  KEY evento_termino_ix (termino_evento)
);

CREATE TABLE evento_ocorrencia (
  id_ocorrencia int NOT NULL AUTO_INCREMENT,
  id_evento int NOT NULL,
  inicio_ocorrencia datetime NOT NULL,
  PRIMARY KEY (id_ocorrencia),
  KEY evento_ocorrencia_id_evento_ix (id_evento, inicio_ocorrencia),
  KEY evento_ocorrencia_inicio_ocorrencia_ix (inicio_ocorrencia),
  FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE ON UPDATE RESTRICT
);

CREATE TABLE sala (
	id_sala int PRIMARY KEY AUTO_INCREMENT,
  desc_sala varchar(45)
);

CREATE TABLE evento_sala (
	id_evento int NOT NULL,
  id_sala int NOT NULL,
  FOREIGN KEY(id_evento) REFERENCES evento(id_evento),
  FOREIGN KEY(id_sala) REFERENCES sala(id_sala),
  PRIMARY KEY (id_evento, id_sala)
);

CREATE TABLE departamento (
	id_departamento int PRIMARY KEY AUTO_INCREMENT, 
  desc_departamento varchar(45)
);

CREATE TABLE evento_departamento (
	id_evento int NOT NULL,
  id_departamento int NOT NULL,
  FOREIGN KEY (id_evento) REFERENCES evento(id_evento),
  FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento),
  PRIMARY KEY (id_evento, id_departamento)
);
