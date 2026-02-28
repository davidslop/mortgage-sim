---
title: "Requisitos detallados — Simulador de hipoteca con amortizaciones (web en localhost)"
version: "1.0"
date: "2026-02-26"
---

# Requisitos detallados — Simulador de hipoteca con amortizaciones (web en localhost)

**Versión:** 1.0  
**Fecha:** 2026-02-26  

## 1. Objetivo

Construir una aplicación web que se ejecute en **localhost** y permita simular hipotecas con **tramo fijo** y **tramo variable**, incorporando **amortizaciones extraordinarias**. Cada amortización podrá configurarse para:

- **Reducir cuota** (recalcular cuota y mantener plazo restante)
- **Reducir plazo** (mantener cuota y recalcular plazo restante)

Además, el sistema debe aplicar un **límite anual de amortización extra** (por defecto, **20%**) y generar un **cuadro de amortización mensual** completo, con métricas agregadas y exportación.

---

## 2. Alcance

### 2.1 Incluye (MVP)

- Formulario de configuración de hipoteca:
  - Principal (importe del préstamo)
  - Plazo inicial
  - Tramo fijo
  - Tipo fijo anual
  - Euríbor supuesto
  - Diferencial
  - Tipo variable anual (calculado)
  - Tope anual de amortización (%)
  - Modo de año para el tope (bloques 12 meses o año natural)
  - Fecha inicio (si se usa año natural)
- Tabla editable de amortizaciones:
  - Mes
  - Importe extra
  - Modo: reducir cuota / reducir plazo
  - Comentario
- Motor de cálculo mensual con:
  - Cuota, interés, amortización, saldo
  - Aplicación del tope anual a la amortización extra
  - Flags/avisos (p. ej. recorte por tope)
- KPIs:
  - Intereses totales
  - Total amortización extra aplicada
  - Pagos totales
  - Mes/fecha estimada de cancelación
  - Años restantes
- Exportación:
  - CSV del cuadro
  - JSON del escenario (inputs + amortizaciones)
- Persistencia local:
  - Guardar/cargar escenarios en `localStorage`

### 2.2 Fuera de alcance (MVP)

- Datos reales automáticos del Euríbor (solo valores manuales).
- Cálculos fiscales (IRPF, plusvalía, gastos de venta, etc.).
- Autenticación / multiusuario.
- Despliegue en internet (solo local).

### 2.3 Opcional (V1.1 / V2)

- Serie temporal de tipos (Euríbor por mes/año).
- Comparador de escenarios A/B.
- Gráficas (saldo, interés, cuota).
- Exportación XLSX con múltiples hojas.

---

## 3. Usuarios y casos de uso

### 3.1 Usuario objetivo

Usuario particular en España que desea planificar una hipoteca y amortizaciones, viendo el impacto en:

- Cuota mensual
- Plazo restante
- Intereses totales

### 3.2 Casos de uso principales

1. Configurar hipoteca (principal, plazo, tramo fijo, tipos).
2. Introducir amortizaciones (mes, importe, modo).
3. Ver cuadro mensual completo con tope anual aplicado.
4. Ajustar tipos (Euríbor/diferencial) y recalcular.
5. Exportar resultados y guardar escenarios.

---

## 4. Requisitos funcionales

### 4.1 Configuración de hipoteca (Inputs)

La UI debe permitir editar (con validación en tiempo real):

| Campo | Tipo | Ejemplo | Validación | Notas |
|---|---:|---:|---|---|
| Principal | EUR | 405480 | > 0 | Decimales permitidos; mostrar 2 decimales |
| Plazo inicial | Meses (int) | 360 | >= 1 | Puede cancelarse antes por amortizaciones |
| Tramo fijo | Meses (int) | 60 | 0..plazo | Fijo para meses 1..tramo_fijo |
| Tipo fijo anual | % | 1,40% | >= 0 | Interno decimal (0.014) |
| Euríbor supuesto | % | 3,00% | >= -1% (configurable) | MVP: constante |
| Diferencial | % | 0,35% | >= 0 | Variable = Euríbor + diferencial |
| Tipo variable anual | calculado | 3,35% | - | Auto: euríbor + diferencial |
| Tope amortización anual | % | 20% | 0..100% | Tope sobre extra anual |
| Modo de año (tope) | enum | Bloques / Natural | obligatorio | Ver 4.3.4 |
| Fecha inicio (si Natural) | YYYY-MM | 2026-03 | obligatorio si Natural | Para mapear meses a años |

**Validaciones críticas:**
- `fixedMonths <= termMonths`
- `principal > 0`
- Tipos >= 0 (o permitir Euríbor negativo bajo configuración)

---

### 4.2 Plan de amortizaciones

CRUD completo: añadir, editar inline, borrar, duplicar fila.

Columnas:
- **Mes** (entero 1..n) — se aplica **al inicio del mes**
- **Importe extra** (EUR >= 0)
- **Modo**: `Reducir cuota` | `Reducir plazo`
- **Comentario** (opcional)

Reglas:
- Ordenar por mes automáticamente.
- Manejar duplicados:
  - Opción recomendada MVP: permitir duplicados y **sumar importes por mes**.
  - Si hay modos distintos en el mismo mes, definir regla (ver 4.2.1).

#### 4.2.1 Regla si hay varias amortizaciones en el mismo mes

Definir una regla determinista. Recomendación MVP:

- **extra_plan_mes = suma** de todas las amortizaciones del mes.
- Modo:
  - O bien exigir que sean iguales (si no, error),
  - o aplicar prioridad configurable, por ejemplo:
    - prioridad 1: `Reducir cuota`
    - prioridad 2: `Reducir plazo`

---

### 4.3 Motor de cálculo del cuadro mensual

El motor debe generar filas hasta:
- `termMonths` o
- cancelación anticipada (saldo <= umbral, p. ej. 0,01 EUR).

#### 4.3.1 Orden de operaciones por mes

1. Determinar tipo anual del mes (fijo o variable).
2. Determinar si comienza un nuevo “año” (según modo de año del tope).
   - Si sí: `saldo_base_año = saldo_pendiente` y `extra_acumulada_año = 0`.
3. Leer amortización planificada del mes `extra_plan`.
4. Calcular `extra_aplicable` respetando el tope:
   - `extra_aplicable = min(extra_plan, tope_restante, saldo_pendiente)`
5. Aplicar extra al inicio:
   - `saldo_tras_extra = saldo_inicial - extra_aplicable`
6. Si `extra_aplicable > 0`:
   - aplicar modo de amortización (recalcular cuota o plazo)
7. Calcular interés del mes sobre `saldo_tras_extra`.
8. Calcular amortización de principal dentro de cuota:
   - `principal = max(0, min(saldo_tras_extra, cuota - interes))`
9. Saldo final:
   - `saldo_final = saldo_tras_extra - principal`
10. Guardar fila.

#### 4.3.2 Tipos de interés

- Meses `1..fixedMonths` → `fixedAnnualRate`
- Meses `> fixedMonths` → `variableAnnualRate`

MVP:
- `variableAnnualRate = euribor + spread` (constante)

V2:
- serie temporal de `variableAnnualRate` por mes/año.

#### 4.3.3 Definición de “Reducir cuota” vs “Reducir plazo”

Tras aplicar `saldo_tras_extra`:

- **Reducir cuota**
  - Mantener plazo restante.
  - Recalcular cuota con PMT:
    - `cuota = PMT(r, n_restante, saldo_tras_extra)`
- **Reducir plazo**
  - Mantener cuota vigente.
  - Recalcular plazo restante con NPER:
    - `n_restante = ceil(NPER(r, cuota, saldo_tras_extra))`

#### 4.3.4 Tope anual del 20%

Variables por año:
- `cap_rate` (default 0.20)
- `saldo_base_año` = saldo pendiente al inicio del año (recomendado)
- `tope_año = cap_rate * saldo_base_año`
- `extra_acumulada_año = suma(extra_aplicable_mes)` dentro del año
- `tope_restante = max(0, tope_año - extra_acumulada_año)`

Aplicación mensual:
- `extra_aplicable_mes = min(extra_plan_mes, tope_restante, saldo_inicial)`

Si `extra_plan_mes > extra_aplicable_mes`, registrar:
- `extra_no_aplicada = extra_plan_mes - extra_aplicable_mes`
- flag `EXTRA_RECORTADA_POR_TOPE`

#### 4.3.5 Modo de año (para el tope)

Debe existir un selector:

- **Bloques de 12 meses**:
  - Año 1 = meses 1–12, año 2 = 13–24, etc.
- **Año natural**:
  - Requiere `startYearMonth (YYYY-MM)`
  - Mapea cada mes a un calendario real (enero–diciembre)

---

### 4.4 Campos del cuadro mensual

Cada fila debe incluir al menos:

- Identificación:
  - Mes (1..n)
  - Año (según modo)
- Tipo:
  - Tipo anual aplicado (%)
- Cuota/Plazo vigentes:
  - Cuota vigente (EUR)
  - Plazo vigente restante (meses)
- Saldos:
  - Saldo inicial
  - Saldo tras extra
  - Saldo final
- Intereses y amortización:
  - Interés del mes
  - Amortización (principal) dentro de cuota
- Amortizaciones extra:
  - Extra planificada
  - Extra aplicada
  - Extra acumulada en el año
  - Tope del año
  - Extra no aplicada
- Flags:
  - `EXTRA_RECORTADA_POR_TOPE`
  - `CUOTA_INSUFICIENTE` (cuando cuota <= interés)
  - `DATOS_INVALIDOS` (inputs no válidos)

---

### 4.5 Métricas agregadas (KPIs)

- **Intereses totales** = suma de interés mensual.
- **Total extra aplicada** = suma de extra_aplicable.
- **Pagos totales (cuotas)** = suma de cuota mensual pagada.
- **Pagos totales (cuotas + extras)** = pagos cuotas + extra aplicada.
- **Mes de cancelación** = primer mes con `saldo_final <= umbral`.
- **Años restantes** = `mes_cancelación / 12`.

---

### 4.6 Exportación e importación

#### 4.6.1 Exportación (MVP)

- Exportar **CSV** del cuadro mensual.
- Exportar **JSON** de escenario:
  - inputs
  - amortizaciones
  - metadatos (nombre, versión, fecha)

#### 4.6.2 Importación (MVP)

- Importar JSON de escenario.
- Validar versión y compatibilidad.
- Pueblar inputs y amortizaciones.

---

### 4.7 Persistencia local

- Guardar escenarios en `localStorage` con:
  - id
  - nombre
  - fecha guardado
  - contenido (inputs + amortizaciones)
- Acciones:
  - Guardar nuevo
  - Sobrescribir
  - Duplicar
  - Borrar
  - Cargar

---

## 5. Requisitos no funcionales

### 5.1 Rendimiento

- Recalcular 360 meses en < 500 ms en equipos normales.
- Debounce al editar inputs (200–300 ms).

### 5.2 Fiabilidad y exactitud

- Resultados reproducibles y deterministas.
- Redondeo solo en presentación.
- Umbral de cancelación configurable (0,01 EUR por defecto).
- Manejo explícito de casos límite (cuota insuficiente).

### 5.3 Usabilidad

- Validaciones en línea y mensajes claros.
- Avisos cuando:
  - extra plan > extra aplicada
  - cuota insuficiente
- Tabla de amortizaciones fácil de editar.
- Tabla del cuadro con scroll y columnas clave visibles.

### 5.4 Privacidad y seguridad

- Sin envío de datos a internet.
- Todo local.

---

## 6. Requisitos técnicos

### 6.1 Estructura sugerida del proyecto

```text
mortgage-sim/
  src/
    components/
      InputsForm.tsx
      AmortizationsTable.tsx
      ResultsSummary.tsx
      ScheduleTable.tsx
      ScenarioManager.tsx
    lib/
      finance.ts    (PMT, NPER)
      engine.ts     (cálculo mensual + tope)
      types.ts
      export.ts     (CSV/JSON)
      storage.ts    (localStorage)
    App.tsx