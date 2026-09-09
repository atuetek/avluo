{{- define "pwa.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "pwa.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "pwa.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- define "pwa.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "pwa.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
{{- define "pwa.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pwa.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
