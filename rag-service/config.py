import os
import os.path as osp

# 加载环境变量文件
def load_env_file(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip() and not line.strip().startswith('#'):
                        try:
                            key, value = line.strip().split('=', 1)
                            # 移除引号
                            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                                value = value[1:-1]
                            yield key, value
                        except ValueError:
                            continue
            return True
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
    return False

# 基础路径
BASE_DIR = osp.dirname(__file__)

# 加载环境变量
if load_env_file(osp.join(BASE_DIR, '.env')):
    print("Loaded .env")

# 加载.env.docker中未设置的变量
for key, value in load_env_file(osp.join(BASE_DIR, '.env.docker')) or []:
    if key not in os.environ:
        os.environ[key] = value
print("Loaded .env.docker (missing keys)")

# 数据配置 - 使用当前文件夹下的data/kb
DATA_DIR = os.getenv('RAG_DATA_DIR', osp.join(BASE_DIR, 'data', 'kb'))
INDEX_PATH = os.getenv('RAG_INDEX_PATH', osp.join(DATA_DIR, 'index.faiss'))
META_PATH = os.getenv('RAG_META_PATH', osp.join(DATA_DIR, 'meta.json'))

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)

# 配置项
MODEL_NAME = os.getenv('RAG_MODEL_NAME', r'.\model')

DB_CONFIG = {
    'host': os.getenv('RAG_DB_HOST', 'localhost'),
    'port': int(os.getenv('RAG_DB_PORT', '3306')),
    'user': os.getenv('RAG_DB_USER', 'root'),
    'password': os.getenv('RAG_DB_PASS', 'root'),
    'database': os.getenv('RAG_DB_NAME', 'mental_health')
}

SERVICE_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'log_level': 'info'
}