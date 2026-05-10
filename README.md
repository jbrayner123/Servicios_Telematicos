**Servicios Telemáticos | Lista 1 | 2026**  
**Herramientas:** NGINX · Node.js · PostgreSQL · Docker · Docker Compose · Artillery · Prometheus · Grafana

---

## ¿De qué trata este proyecto?

Implementamos un **balanceador de carga** usando NGINX como proxy inverso. En lugar de que todos los usuarios lleguen a un solo servidor, NGINX distribuye el tráfico entre 3 backends (servidores Node.js) que comparten una base de datos PostgreSQL. Esto mejora el rendimiento, evita que un solo servidor se sature y permite que el sistema siga funcionando aunque uno de los servidores falle.

Se implementaron y compararon 3 algoritmos de balanceo:
- **Round Robin** — distribuye las peticiones en orden rotativo entre los backends
- **Least Conn** — envía cada petición al backend con menos conexiones activas
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
                │      │      │
          ┌─────▼─┐ ┌──▼───┐ ┌▼──────┐
          │back-1 │ │back-2│ │back-3 │  ← Node.js + Express
          │:3000  │ │:3000 │ │:3000  │
          └───┬───┘ └──┬───┘ └───┬───┘
              └─────────┼─────────┘
                        │
                  ┌─────▼──────┐
                  │ PostgreSQL │  ← BD compartida
                  │  :5432     │
                  └────────────┘

  Monitoreo:
  ┌──────────────────┐     ┌────────────┐     ┌─────────┐
  │ nginx-exporter   │────▶│ Prometheus │────▶│ Grafana │
  │ :9113            │     │ :9090      │     │ :3000   │
  └──────────────────┘     └────────────┘     └─────────┘

  Red interna Docker: red-balanceo
  (los backends y la BD NO son accesibles desde fuera)
```

---

## Estructura del proyecto

```
proyecto/
├── docker-compose.yml            # Orquestación completa
├── docker-compose.override.yml   # Hot-reload para desarrollo
├── .env                          # Variables: puerto, workers, política
├── nginx/
│   └── nginx.conf                # Configuración NGINX (montado como volumen)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js                 # API Node.js + Express + PostgreSQL
│   └── public/
│       └── index.html            # UI web - TiendaTech
├── postgres/
│   └── init.sql                  # Schema + 110 productos + 50 pedidos
├── artillery/
│   └── load-test.yml             # Escenarios de carga
├── prometheus/
│   └── prometheus.yml            # Configuración de scraping
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml    # Datasource automático
        └── dashboards/
            ├── dashboard.yml
            └── nginx.json        # Dashboard preconfigurado
```

---

## Requisitos previos

- Vagrant + VirtualBox instalados
- La VM usa **bento/ubuntu-22.04**
- Docker y Docker Compose se instalan automáticamente al provisionar

---

## Cómo correr el proyecto

### 1. Levantar la VM

```bash
vagrant up servidor
vagrant ssh servidor
```

### 2. Levantar toda la infraestructura

```bash
cd ~/proyecto
docker compose up --build -d
```

Esto construye y levanta todos los contenedores:

```
✔ Container postgres            Started
✔ Container backend1            Started
✔ Container backend2            Started
✔ Container backend3            Started
✔ Container nginx-balanceador   Started
✔ Container nginx-exporter      Started
✔ Container prometheus          Started
✔ Container grafana             Started
```

### 3. Verificar que todo está corriendo

```bash
docker compose ps
```

Todos deben aparecer con estado `running`.

### 4. URLs disponibles

| Servicio | URL | Descripción |
|---|---|---|
| App web | http://localhost:8080 | TiendaTech — interfaz principal |
| NGINX status | http://localhost:8080/nginx_status | Métricas básicas en tiempo real |
| Prometheus | http://localhost:9090 | Consulta de métricas |
| Grafana | http://localhost:3000 | Dashboard visual (admin / admin123) |

---

## Base de datos

PostgreSQL con 4 tablas relacionadas y datos de ejemplo:

```
categorias (10)
    │
    └── productos (110)
              │
              └── pedido_items ──── pedidos (50)
```

- **10 categorías**: Laptops, Smartphones, Monitores, Accesorios, Componentes, Audio, Almacenamiento, Redes, Impresoras, Gaming
- **110 productos** con nombre, precio, stock y descripción
- **50 pedidos** distribuidos entre los 3 backends con timestamps históricos
- **Transacciones reales**: al crear un pedido se descuenta el stock automáticamente

---

## Cambiar el algoritmo de balanceo

Editar `nginx/nginx.conf` en el bloque `upstream`:

```nginx
upstream backends {
    # Activar solo uno de los siguientes:
    # least_conn;   ← menor carga
    # ip_hash;      ← persistencia por IP
    # (sin nada = round-robin por defecto)

    server backend1:3000 max_fails=3 fail_timeout=10s;
    server backend2:3000 max_fails=3 fail_timeout=10s;
    server backend3:3000 max_fails=3 fail_timeout=10s;
}
```

Luego reiniciar solo NGINX:

```bash
docker compose restart nginx
```

### Verificar el algoritmo activo

```bash
for i in {1..9}; do curl -s http://localhost/api/info | grep backend; done
```

---

## Pruebas de carga con Artillery

El escenario tiene 3 fases de carga progresiva:

```yaml
phases:
  - duration: 20s   arrivalRate: 5     # Calentamiento
  - duration: 60s   arrivalRate: 50    # Rampa → 1000 usuarios
    rampTo: 1000
  - duration: 30s   arrivalRate: 1000  # Carga máxima
```

### Ejecutar las pruebas

```bash
docker compose run --rm artillery run /scripts/load-test.yml
```

---

## Prueba de resiliencia

Desde dos terminales simultáneas:

**Terminal 1 — lanzar carga:**
```bash
docker compose run --rm artillery run /scripts/load-test.yml
```

**Terminal 2 — eliminar backend en caliente:**
```bash
# Cuando veas "Rampa de carga" en terminal 1:
docker stop backend2 && echo ">>> backend2 eliminado <<<"

# Verificar que el servicio sigue respondiendo
for i in {1..6}; do curl -s http://localhost/api/info | grep backend; done

# Recuperar el backend
docker start backend2
```

---

## Resultados obtenidos

### Comparativa de algoritmos (backends simples)

| Métrica | Round Robin | Least Conn | IP Hash |
|---|---|---|---|
| Request rate | 510 req/seg | 443 req/seg | 500 req/seg |
| Errores | 0 ✅ | 0 ✅ | 0 ✅ |
| Latencia media | 4.4 ms | 30.5 ms | 29.2 ms |
| p95 | 12.1 ms | 92.8 ms | 89.1 ms |
| p99 | 19.9 ms | 117.9 ms | 149.9 ms |

**Conclusión:** Round Robin obtuvo el mejor rendimiento porque los backends son idénticos y la carga es uniforme — exactamente las condiciones donde este algoritmo es óptimo. IP Hash fue más lento porque toda la carga de una misma IP cayó sobre un solo backend. Least Conn tuvo latencias similares a IP Hash por la misma razón.

### Prueba con app real + PostgreSQL (Round Robin)

| Métrica | Valor |
|---|---|
| Request rate | 355 req/seg |
| Total requests | 123,200 |
| Errores | 0 ✅ |
| Latencia media | 65.1 ms |
| p95 | 186.8 ms |
| p99 | 308 ms |
| Latencia máxima | 5,400 ms* |

*El pico ocurrió exactamente al eliminar backend2 en caliente — NGINX detectó el fallo y redirigió el tráfico automáticamente.

### Prueba de resiliencia

| Métrica | Valor |
|---|---|
| Backend eliminado | backend2 (en plena carga) |
| Errores durante el fallo | 0 ✅ |
| Tiempo de recuperación | Automático (max_fails=3, fail_timeout=10s) |
| Servicio interrumpido | No |

---

## Métricas con Prometheus + Grafana

Al levantar la infraestructura se despliegan automáticamente:

- **nginx-exporter** — expone métricas de NGINX en formato Prometheus
- **Prometheus** — recolecta métricas cada 5 segundos
- **Grafana** — dashboard visual preconfigurado

### Consultas útiles en Prometheus

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

### Grafana

Abrir **http://localhost:3000** con `admin / admin123`.  
El dashboard **NGINX Balanceador de Carga** se carga automáticamente y muestra en tiempo real:
- Requests por segundo
- Conexiones activas y en espera
- Estado del balanceador
- Contador total de requests

---

## Entorno de desarrollo — recarga en caliente

El archivo `docker-compose.override.yml` permite modificar `nginx.conf` y ver los cambios sin reconstruir imágenes:

```bash
# Editar nginx.conf y recargar
docker compose restart nginx

# Ver logs en tiempo real
docker logs nginx-balanceador -f

# Ver métricas en vivo
watch -n 1 'curl -s http://localhost/nginx_status'
```

---

## Apagar todo

```bash
docker compose down        # Mantiene los datos de PostgreSQL
docker compose down -v     # Elimina también el volumen de datos
``` EOF
