# Proyecto 2 — Balanceador de Carga Web con NGINX
**Servicios Telemáticos | Lista 1 | 2026**  
**Herramientas:** NGINX · FastAPI · React + Vite · PostgreSQL · Docker · Docker Compose · Artillery · Prometheus · Grafana

---

## ¿De qué trata este proyecto?

Implementamos un **balanceador de carga** usando NGINX como proxy inverso. En lugar de que todos los usuarios lleguen a un solo servidor, NGINX distribuye el tráfico entre 3 backends (servidores FastAPI en Python) que comparten una base de datos PostgreSQL. Esto mejora el rendimiento, evita que un solo servidor se sature y permite que el sistema siga funcionando aunque uno de los servidores falle.

Se implementaron y compararon 3 algoritmos de balanceo:
- **Round Robin** — distribuye las peticiones en orden rotativo entre los backends
- **Least Connections** — envía cada petición al backend con menos conexiones activas
- **IP Hash** — el mismo usuario siempre llega al mismo backend (útil para sesiones)

---

## Arquitectura

```
         Cliente (navegador / Artillery)
                      │
                      ▼
         ┌─────────────────────┐
         │   NGINX :80         │  ← Balanceador + Proxy inverso
         │   nginx-balanceador │
         └──────┬──────┬───────┘
                │      │      
          ┌─────▼─┐ ┌──▼───┐ ┌──────┐
          │back-1 │ │back-2│ │back-3│  ← FastAPI (Python)
          │:8000  │ │:8000 │ │:8000 │
          └───┬───┘ └──┬───┘ └──┬───┘
              └─────────┼────────┘
                        │
                  ┌─────▼──────┐
                  │ PostgreSQL │  ← BD compartida
                  │  :5432     │
                  └────────────┘

         ┌──────────┐     ┌────────────┐     ┌─────────┐
         │ frontend │     │  Prometheus│────▶│ Grafana │
         │ React+   │     │  :9090     │     │ :3000   │
         │ Vite :80 │     └────────────┘     └─────────┘
         └──────────┘            ▲
                        ┌────────┴───────┐
                        │ nginx-exporter │
                        │ :9113          │
                        └────────────────┘

  Red interna Docker: red-balanceo
  (backends y BD NO son accesibles desde fuera)
```

---

## Estructura del proyecto

```
proyecto/
├── docker-compose.yml            # Orquestación completa
├── docker-compose.override.yml   # Hot-reload para desarrollo
├── .env                          # Variables: puerto, workers
├── nginx/
│   └── nginx.conf                # 3 algoritmos + proxy (montado como volumen)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt          # Dependencias Python
│   └── main.py                   # API FastAPI + PostgreSQL
├── frontend/
│   ├── Dockerfile                # Build React + Vite
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── StatCard.jsx
│       │   └── BackendBadge.jsx  # Indicador del backend activo
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Productos.jsx
│       │   └── Pedidos.jsx
│       └── services/
│           └── api.js            # Llamadas a FastAPI
├── postgres/
│   └── init.sql                  # Schema + 110 productos + 50 pedidos
├── artillery/
│   └── load-test.yml             # Escenarios de carga
├── prometheus/
│   └── prometheus.yml
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml
        └── dashboards/
            ├── dashboard.yml
            └── nginx.json        # Dashboard preconfigurado
```

---

## Requisitos previos

### Opción A — Con Vagrant (recomendada)
- [VirtualBox](https://www.virtualbox.org/wiki/Downloads) instalado
- [Vagrant](https://developer.hashicorp.com/vagrant/downloads) instalado
- Git instalado

### Opción B — Sin Vagrant (Linux/Mac)
- Docker y Docker Compose instalados
- Git instalado

### Opción C — Windows sin Vagrant
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y abierto
- Git instalado

---

## Instalación y despliegue

### Con Vagrant

#### 1. Clonar el repositorio

```bash
git clone https://github.com/jbrayner123/Servicios_Telematicos.git
cd Servicios_Telematicos
```

#### 2. Levantar la VM

```bash
vagrant up servidor
```

Esto crea la VM con Ubuntu 22.04 e instala Docker automáticamente. Puede tardar unos minutos la primera vez.

#### 3. Entrar a la VM

```bash
vagrant ssh servidor
```

#### 4. Arreglar DNS de Docker (solo primera vez)

```bash
sudo rm /etc/resolv.conf && \
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf && \
sudo systemctl restart docker
```

#### 5. Levantar el proyecto

```bash
cd ~/proyecto
docker compose up --build -d
```

Esto construye y levanta todos los contenedores. La primera vez tarda unos minutos.

#### 6. Verificar que todo está corriendo

```bash
docker compose ps
```

Todos deben aparecer con estado `running`:
```
NAME                STATUS
backend1            running
backend2            running
backend3            running
frontend            running
nginx-balanceador   running
nginx-exporter      running
postgres            running
prometheus          running
grafana             running
```

---

### Sin Vagrant (Linux/Mac/Windows con Docker Desktop)

#### 1. Clonar el repositorio

```bash
git clone https://github.com/jbrayner123/Servicios_Telematicos.git
cd Servicios_Telematicos/proyecto
```

#### 2. Levantar el proyecto

```bash
docker compose up --build -d
```

#### 3. Verificar

```bash
docker compose ps
```

---

## URLs disponibles

| Servicio | URL | Descripción |
|---|---|---|
| App web | http://localhost:8080 | TiendaTech — interfaz principal |
| NGINX status | http://localhost:8080/nginx_status | Métricas básicas en tiempo real |
| API docs | http://localhost:8080/api/docs | Documentación automática FastAPI |
| Prometheus | http://localhost:9090 | Consulta de métricas |
| Grafana | http://localhost:3000 | Dashboard visual (admin / admin123) |

---

## Base de datos

PostgreSQL con 4 tablas relacionadas:

```
categorias (10)
    │
    └── productos (110)
              │
              └── pedido_items ──── pedidos (50)
```

**Categorías disponibles:** Laptops, Smartphones, Monitores, Accesorios, Componentes, Audio, Almacenamiento, Redes, Impresoras, Gaming

**Datos precargados:**
- 110 productos con nombre, precio, stock y descripción
- 50 pedidos con historial de 30 días distribuidos entre los 3 backends
- Transacciones reales: al crear un pedido se descuenta el stock automáticamente

---

## Cambiar el algoritmo de balanceo

Editar `nginx/nginx.conf` — solo cambiar la palabra en `proxy_pass`:

```nginx
location /api/ {
    proxy_pass http://backend_round_robin;   # ← cambiar aquí
    # Opciones disponibles:
    # proxy_pass http://backend_round_robin;
    # proxy_pass http://backend_least_conn;
    # proxy_pass http://backend_ip_hash;
}
```

Desde la terminal:

```bash
# Cambiar a least_conn
sed -i 's|proxy_pass http://backend_round_robin;|proxy_pass http://backend_least_conn;|g' nginx/nginx.conf
docker compose restart nginx

# Cambiar a ip_hash
sed -i 's|proxy_pass http://backend_least_conn;|proxy_pass http://backend_ip_hash;|g' nginx/nginx.conf
docker compose restart nginx

# Volver a round_robin
sed -i 's|proxy_pass http://backend_ip_hash;|proxy_pass http://backend_round_robin;|g' nginx/nginx.conf
docker compose restart nginx
```

Verificar el algoritmo activo:

```bash
grep "proxy_pass http://backend" nginx/nginx.conf | grep -v "#"
```

---

## Pruebas de carga con Artillery

El escenario tiene 3 fases de carga progresiva:

```
Calentamiento (20s):  5 usuarios/seg
Rampa (60s):          50 → 1000 usuarios
Carga máxima (30s):   1000 usuarios/seg
```

### Ejecutar prueba

```bash
docker compose run --rm artillery run /scripts/load-test.yml
```

### Ejecutar con Grafana en paralelo

1. Abrir http://localhost:3000 en el navegador
2. Ir a **Dashboards → NGINX → NGINX Balanceador de Carga**
3. Lanzar Artillery desde la terminal
4. Ver las gráficas subir en tiempo real

---

## Prueba de resiliencia

Desde dos terminales simultáneas:

**Terminal 1 — lanzar carga:**
```bash
cd ~/proyecto
docker compose run --rm artillery run /scripts/load-test.yml
```

**Terminal 2 — eliminar backend en caliente:**
```bash
# Cuando veas "Rampa de carga" en terminal 1:
docker stop backend2 && echo ">>> backend2 eliminado <<<"

# Verificar que el servicio sigue con backend-1 y backend-3
for i in {1..6}; do curl -s http://localhost/api/info; echo; done

# Recuperar el backend
docker start backend2
```

**Resultado esperado:** El servicio nunca se interrumpe. NGINX detecta el fallo automáticamente gracias a `max_fails=3 fail_timeout=10s` y redirige el tráfico a los backends disponibles.

---

## Resultados obtenidos

### Comparativa de algoritmos con FastAPI + PostgreSQL

| Métrica | Round Robin | Least Conn | IP Hash |
|---|---|---|---|
| Request rate | 244/seg | 236/seg | 334/seg* |
| Errores | 6 | 0 ✅ | 56,026 ❌ |
| Latencia media | 340.9 ms | 313.1 ms | 2,246 ms |
| p95 | 1,085 ms | 1,022 ms | 7,557 ms |
| p99 | 1,826 ms | 1,380 ms | 7,865 ms |

*ip_hash colapsó porque Artillery usa una sola IP — toda la carga fue al mismo backend

### Análisis por algoritmo

**Round Robin** — estable y predecible. 6 timeouts bajo carga extrema de 1000 usuarios concurrentes con consultas reales a PostgreSQL. Ideal cuando todos los backends son idénticos.

**Least Connections** — el mejor resultado. 0 errores y menor p99. Al detectar que algunas consultas tardan más (como traer 110 productos), distribuye inteligentemente evitando saturar un solo backend.

**IP Hash** — colapsó en la prueba porque Artillery genera tráfico desde una sola IP. En producción real con miles de IPs distintas funcionaría correctamente. Su uso ideal es cuando el backend guarda sesiones en memoria.

### Prueba de resiliencia

| Métrica | Valor |
|---|---|
| Backend eliminado | backend2 (en plena carga) |
| Peticiones exitosas | 119,593 |
| Errores de servidor (500) | 1 |
| Servicio interrumpido | No ✅ |
| Recuperación | Automática al hacer `docker start backend2` |

---

## Métricas con Prometheus + Grafana

### Consultas útiles en Prometheus (http://localhost:9090)

```
# Requests por segundo
rate(nginx_http_requests_total[30s])

# Conexiones activas
nginx_connections_active

# Conexiones en espera
nginx_connections_waiting

# Estado de NGINX (1 = up, 0 = down)
nginx_up

# Total de requests acumulados
nginx_http_requests_total
```

### Grafana (http://localhost:3000)

Credenciales: `admin` / `admin123`

El dashboard **NGINX Balanceador de Carga** se carga automáticamente y muestra en tiempo real:
- Requests por segundo
- Conexiones activas y en espera
- Estado del balanceador
- Contador total de requests

---

## Comandos útiles

```bash
# Ver estado de todos los contenedores
docker compose ps

# Ver logs de NGINX en tiempo real
docker logs nginx-balanceador -f

# Ver métricas NGINX en vivo
watch -n 1 'curl -s http://localhost/nginx_status'

# Ver distribución de balanceo
for i in {1..9}; do curl -s http://localhost/api/info; echo; done

# Reiniciar solo NGINX (sin bajar backends)
docker compose restart nginx

# Apagar todo (mantiene datos de PostgreSQL)
docker compose down

# Apagar todo y borrar datos
docker compose down -v
```

---

## Entorno de desarrollo — recarga en caliente

El archivo `docker-compose.override.yml` permite modificar `nginx.conf` y ver los cambios sin reconstruir imágenes:

```bash
# Editar nginx.conf y recargar
docker compose restart nginx

# Ver logs de un backend específico
docker logs backend1 -f

# Entrar a un contenedor
docker exec -it backend1 bash
```

---

## Apagar la VM (si usas Vagrant)

```bash
# Desde tu máquina real
vagrant halt servidor      # Apagar la VM
vagrant up servidor        # Volver a encender
vagrant destroy servidor   # Eliminar la VM completamente
```
