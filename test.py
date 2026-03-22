import numpy as np

def calculate_db_gain(initial_vol_percent, increment_percent):
    v1 = initial_vol_percent / 100.0
    v2 = (initial_vol_percent + increment_percent) / 100.0
    if v1 <= 0:
        return float('inf')
    # La relación en Windows Core Audio entre el valor escalar [0,1] y decibelios
    # sigue comúnmente una curva donde dB = 20 * log10(volumen_escalar)
    gain_db = 20 * np.log10(v2 / v1)
    return gain_db

# Simulación de un paso estándar de Windows (2%)
vol_inicial = 20
incremento = 2
gain = calculate_db_gain(vol_inicial, incremento)
print(f'Ganancia calculada: {gain} dB')

# Script PowerShell resultante:
# $obj = New-Object -ComObject WScript.Shell
# $obj.SendKeys([char]175) # Código hexadecimal 0xAF para Volume_Up