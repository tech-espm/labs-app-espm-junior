function converterEventos(ocorrencias) {
	if (!ocorrencias)
		return null;
	for (var i = 0; i < ocorrencias.length; i++) {
		// https://fullcalendar.io/docs/event-object
		var data = DataUtil.converterDataISO(ocorrencias[i].inicio_ocorrencia);
		ocorrencias[i].backgroundColor = "#3788d8";
		ocorrencias[i].borderColor = "#3788d8";
		ocorrencias[i].textColor = "#fff";
		ocorrencias[i].title = ocorrencias[i].nome_evento;
		ocorrencias[i].desc_departamento = ocorrencias[i].desc_departamento;
		ocorrencias[i].url = ocorrencias[i].desc_evento || "/";
		ocorrencias[i].start = data;
		ocorrencias[i].end = data;
	}
}
