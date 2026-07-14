"""
PROYECTO FINAL DE MÉTODOS NUMÉRICOS

Análisis numérico de la carga de un capacitor
en un circuito RC.

Métodos utilizados:
1. Interpolación de Newton
2. Spline cúbico natural
3. Método de Newton-Raphson
4. Diferencias finitas
5. Regla de Simpson 1/3
6. Runge-Kutta de cuarto orden

Autor: Richard Hilares Gutierrez
"""

import numpy as np
import matplotlib.pyplot as plt


# ============================================================
# DATOS GENERALES DEL CIRCUITO RC
# ============================================================

VS = 5.0             # Voltaje de alimentación en voltios
R = 2200.0           # Resistencia en ohmios
C = 100e-6           # Capacitancia en faradios (100 microfaradios)
TAU = R * C          # Constante de tiempo del circuito


# Datos experimentales de tiempo y voltaje
tiempo_exp = np.array([0.0, 0.2, 0.4, 0.6, 0.8])

voltaje_exp = np.array([0.0, 2.98, 4.19, 4.67, 4.87])


# ============================================================
# 1. INTERPOLACIÓN DE NEWTON
# ============================================================

def diferencias_divididas(x, y):
    """
    Calcula los coeficientes del polinomio interpolante
    de Newton mediante diferencias divididas.
    """

    n = len(x)
    coeficientes = np.array(y, dtype=float)

    for j in range(1, n):
        for i in range(n - 1, j - 1, -1):
            numerador = coeficientes[i] - coeficientes[i - 1]
            denominador = x[i] - x[i - j]

            coeficientes[i] = numerador / denominador

    return coeficientes


def evaluar_newton(valor_x, x, coeficientes):
    """
    Evalúa el polinomio de Newton en un punto determinado.
    """

    n = len(coeficientes)
    resultado = coeficientes[n - 1]

    for i in range(n - 2, -1, -1):
        resultado = (
            resultado * (valor_x - x[i])
            + coeficientes[i]
        )

    return resultado


# ============================================================
# 2. SPLINE CÚBICO NATURAL
# ============================================================

def calcular_spline_natural(x, y):
    """
    Calcula las segundas derivadas necesarias
    para formar el spline cúbico natural.
    """

    n = len(x)
    h = np.diff(x)

    matriz = np.zeros((n, n))
    vector = np.zeros(n)

    # Condiciones naturales en los extremos
    matriz[0, 0] = 1.0
    matriz[n - 1, n - 1] = 1.0

    for i in range(1, n - 1):
        matriz[i, i - 1] = h[i - 1]

        matriz[i, i] = 2.0 * (
            h[i - 1] + h[i]
        )

        matriz[i, i + 1] = h[i]

        vector[i] = 6.0 * (
            (y[i + 1] - y[i]) / h[i]
            - (y[i] - y[i - 1]) / h[i - 1]
        )

    segundas_derivadas = np.linalg.solve(
        matriz,
        vector
    )

    return segundas_derivadas


def evaluar_spline_natural(valor_x, x, y, m):
    """
    Evalúa el spline cúbico natural en un punto.
    """

    if valor_x < x[0] or valor_x > x[-1]:
        raise ValueError(
            "El valor está fuera del intervalo de datos."
        )

    indice = np.searchsorted(x, valor_x) - 1

    if indice < 0:
        indice = 0

    if indice >= len(x) - 1:
        indice = len(x) - 2

    h = x[indice + 1] - x[indice]

    termino_1 = (
        m[indice]
        * (x[indice + 1] - valor_x) ** 3
        / (6.0 * h)
    )

    termino_2 = (
        m[indice + 1]
        * (valor_x - x[indice]) ** 3
        / (6.0 * h)
    )

    termino_3 = (
        y[indice]
        - m[indice] * h**2 / 6.0
    ) * (
        x[indice + 1] - valor_x
    ) / h

    termino_4 = (
        y[indice + 1]
        - m[indice + 1] * h**2 / 6.0
    ) * (
        valor_x - x[indice]
    ) / h

    return termino_1 + termino_2 + termino_3 + termino_4


# ============================================================
# 3. MÉTODO DE NEWTON-RAPHSON
# ============================================================

def funcion_rc(tiempo, voltaje_objetivo):
    """
    Ecuación de carga del capacitor igualada
    al voltaje que se desea alcanzar.
    """

    return (
        VS * (1.0 - np.exp(-tiempo / TAU))
        - voltaje_objetivo
    )


def derivada_funcion_rc(tiempo):
    """
    Derivada de la ecuación utilizada
    en el método de Newton-Raphson.
    """

    return (
        VS / TAU
    ) * np.exp(-tiempo / TAU)


def newton_raphson(
    voltaje_objetivo,
    tiempo_inicial,
    tolerancia=1e-6,
    max_iteraciones=100
):
    """
    Calcula el tiempo necesario para alcanzar
    un determinado voltaje en el capacitor.
    """

    tiempo = tiempo_inicial

    for iteracion in range(1, max_iteraciones + 1):

        valor_funcion = funcion_rc(
            tiempo,
            voltaje_objetivo
        )

        valor_derivada = derivada_funcion_rc(
            tiempo
        )

        if abs(valor_derivada) < 1e-12:
            raise ValueError(
                "La derivada es demasiado pequeña."
            )

        nuevo_tiempo = (
            tiempo
            - valor_funcion / valor_derivada
        )

        error = abs(nuevo_tiempo - tiempo)

        if error < tolerancia:
            return nuevo_tiempo, iteracion

        tiempo = nuevo_tiempo

    raise RuntimeError(
        "Newton-Raphson no logró converger."
    )


# ============================================================
# 4. DIFERENCIAS FINITAS
# ============================================================

def diferencia_progresiva(y, h):
    """
    Calcula la derivada aproximada mediante
    diferencias finitas progresivas.
    """

    n = len(y)
    derivada = np.zeros(n)

    for i in range(n - 1):
        derivada[i] = (
            y[i + 1] - y[i]
        ) / h

    derivada[n - 1] = derivada[n - 2]

    return derivada


def diferencia_centrada(y, h):
    """
    Calcula la derivada aproximada mediante
    diferencias finitas centradas.
    """

    n = len(y)
    derivada = np.zeros(n)

    derivada[0] = (
        y[1] - y[0]
    ) / h

    for i in range(1, n - 1):
        derivada[i] = (
            y[i + 1] - y[i - 1]
        ) / (2.0 * h)

    derivada[n - 1] = (
        y[n - 1] - y[n - 2]
    ) / h

    return derivada


# ============================================================
# 5. REGLA DE SIMPSON 1/3
# ============================================================

def simpson_un_tercio(x, y):
    """
    Calcula una integral aproximada mediante
    la regla compuesta de Simpson 1/3.
    """

    numero_intervalos = len(x) - 1

    if numero_intervalos % 2 != 0:
        raise ValueError(
            "El número de intervalos debe ser par."
        )

    pasos = np.diff(x)

    if not np.allclose(pasos, pasos[0]):
        raise ValueError(
            "Los datos deben estar igualmente espaciados."
        )

    h = pasos[0]

    suma_impares = np.sum(
        y[1:numero_intervalos:2]
    )

    suma_pares = np.sum(
        y[2:numero_intervalos:2]
    )

    integral = (
        h / 3.0
    ) * (
        y[0]
        + y[-1]
        + 4.0 * suma_impares
        + 2.0 * suma_pares
    )

    return integral


# ============================================================
# 6. RUNGE-KUTTA DE CUARTO ORDEN
# ============================================================

def ecuacion_diferencial_rc(tiempo, voltaje):
    """
    Ecuación diferencial de carga del capacitor:

    dVc/dt = (VS - Vc)/(R*C)
    """

    return (
        VS - voltaje
    ) / (R * C)


def runge_kutta_4(
    funcion,
    tiempo_inicial,
    valor_inicial,
    tiempo_final,
    paso
):
    """
    Resuelve una ecuación diferencial ordinaria
    utilizando Runge-Kutta de cuarto orden.
    """

    tiempos = [tiempo_inicial]
    valores = [valor_inicial]

    tiempo = tiempo_inicial
    valor = valor_inicial

    while tiempo < tiempo_final:

        paso_actual = min(
            paso,
            tiempo_final - tiempo
        )

        k1 = funcion(
            tiempo,
            valor
        )

        k2 = funcion(
            tiempo + paso_actual / 2.0,
            valor + paso_actual * k1 / 2.0
        )

        k3 = funcion(
            tiempo + paso_actual / 2.0,
            valor + paso_actual * k2 / 2.0
        )

        k4 = funcion(
            tiempo + paso_actual,
            valor + paso_actual * k3
        )

        valor = valor + (
            paso_actual / 6.0
        ) * (
            k1
            + 2.0 * k2
            + 2.0 * k3
            + k4
        )

        tiempo = tiempo + paso_actual

        tiempos.append(tiempo)
        valores.append(valor)

    return (
        np.array(tiempos),
        np.array(valores)
    )


# ============================================================
# PROGRAMA PRINCIPAL
# ============================================================

def main():

    print("=" * 60)
    print("ANÁLISIS NUMÉRICO DE UN CIRCUITO RC")
    print("=" * 60)

    print(f"\nVoltaje de alimentación: {VS:.2f} V")
    print(f"Resistencia: {R:.2f} ohmios")
    print(f"Capacitancia: {C:.6f} F")
    print(f"Constante de tiempo RC: {TAU:.4f} s")

    # --------------------------------------------------------
    # Interpolación de Newton
    # --------------------------------------------------------

    tiempo_interpolar = 0.5

    coeficientes_newton = diferencias_divididas(
        tiempo_exp,
        voltaje_exp
    )

    voltaje_newton = evaluar_newton(
        tiempo_interpolar,
        tiempo_exp,
        coeficientes_newton
    )

    print("\n1. INTERPOLACIÓN DE NEWTON")

    print(
        f"Voltaje para t = {tiempo_interpolar:.2f} s: "
        f"{voltaje_newton:.4f} V"
    )

    # --------------------------------------------------------
    # Spline cúbico natural
    # --------------------------------------------------------

    segundas_derivadas = calcular_spline_natural(
        tiempo_exp,
        voltaje_exp
    )

    voltaje_spline = evaluar_spline_natural(
        tiempo_interpolar,
        tiempo_exp,
        voltaje_exp,
        segundas_derivadas
    )

    print("\n2. SPLINE CÚBICO NATURAL")

    print(
        f"Voltaje para t = {tiempo_interpolar:.2f} s: "
        f"{voltaje_spline:.4f} V"
    )

    # --------------------------------------------------------
    # Newton-Raphson
    # --------------------------------------------------------

    voltaje_objetivo = 4.0

    tiempo_nr, iteraciones = newton_raphson(
        voltaje_objetivo=voltaje_objetivo,
        tiempo_inicial=0.3
    )

    print("\n3. MÉTODO DE NEWTON-RAPHSON")

    print(
        f"Voltaje objetivo: {voltaje_objetivo:.2f} V"
    )

    print(
        f"Tiempo calculado: {tiempo_nr:.6f} s"
    )

    print(
        f"Número de iteraciones: {iteraciones}"
    )

    # --------------------------------------------------------
    # Diferencias finitas
    # --------------------------------------------------------

    paso_datos = tiempo_exp[1] - tiempo_exp[0]

    derivada_progresiva = diferencia_progresiva(
        voltaje_exp,
        paso_datos
    )

    derivada_centrada = diferencia_centrada(
        voltaje_exp,
        paso_datos
    )

    print("\n4. DIFERENCIAS FINITAS")

    print("Derivada progresiva:")
    print(derivada_progresiva)

    print("\nDerivada centrada:")
    print(derivada_centrada)

    # --------------------------------------------------------
    # Simpson 1/3
    # --------------------------------------------------------

    integral_voltaje = simpson_un_tercio(
        tiempo_exp,
        voltaje_exp
    )

    print("\n5. REGLA DE SIMPSON 1/3")

    print(
        f"Integral aproximada: "
        f"{integral_voltaje:.6f} V·s"
    )

    # --------------------------------------------------------
    # Runge-Kutta 4
    # --------------------------------------------------------

    tiempo_rk4, voltaje_rk4 = runge_kutta_4(
        funcion=ecuacion_diferencial_rc,
        tiempo_inicial=0.0,
        valor_inicial=0.0,
        tiempo_final=1.0,
        paso=0.02
    )

    # Solución teórica
    voltaje_teorico = VS * (
        1.0 - np.exp(-tiempo_rk4 / TAU)
    )

    # Error absoluto
    error_absoluto = np.abs(
        voltaje_teorico - voltaje_rk4
    )

    error_maximo = np.max(error_absoluto)

    print("\n6. RUNGE-KUTTA DE CUARTO ORDEN")

    print(
        f"Error máximo respecto a la solución teórica: "
        f"{error_maximo:.10f} V"
    )

    # --------------------------------------------------------
    # Tabla de resultados
    # --------------------------------------------------------

    print("\nTABLA DE RESULTADOS DE RUNGE-KUTTA")

    print(
        f"{'Tiempo':>10}"
        f"{'RK4':>15}"
        f"{'Teórico':>15}"
        f"{'Error':>15}"
    )

    for t, vrk, vt, error in zip(
        tiempo_rk4,
        voltaje_rk4,
        voltaje_teorico,
        error_absoluto
    ):
        print(
            f"{t:10.4f}"
            f"{vrk:15.6f}"
            f"{vt:15.6f}"
            f"{error:15.8f}"
        )

    # --------------------------------------------------------
    # Gráfica de voltaje
    # --------------------------------------------------------

    plt.figure(figsize=(9, 6))

    plt.plot(
        tiempo_rk4,
        voltaje_rk4,
        marker="o",
        markersize=3,
        label="Runge-Kutta 4"
    )

    plt.plot(
        tiempo_rk4,
        voltaje_teorico,
        linestyle="--",
        label="Solución teórica"
    )

    plt.scatter(
        tiempo_exp,
        voltaje_exp,
        label="Datos experimentales"
    )

    plt.xlabel("Tiempo (s)")
    plt.ylabel("Voltaje del capacitor (V)")
    plt.title("Carga de un capacitor en un circuito RC")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()

    plt.savefig(
        "grafica_carga_RC.png",
        dpi=300
    )

    plt.show()

    # --------------------------------------------------------
    # Gráfica del error
    # --------------------------------------------------------

    plt.figure(figsize=(9, 6))

    plt.plot(
        tiempo_rk4,
        error_absoluto,
        marker="o",
        markersize=3
    )

    plt.xlabel("Tiempo (s)")
    plt.ylabel("Error absoluto (V)")
    plt.title("Error absoluto del método RK4")
    plt.grid(True)
    plt.tight_layout()

    plt.savefig(
        "grafica_error_RK4.png",
        dpi=300
    )

    plt.show()


# Ejecuta el programa
if __name__ == "__main__":
    main()
