import YAML from 'yamljs';
import path from 'path';

const swaggerDocument = YAML.load(path.resolve(process.cwd(), 'src', 'docs', 'swagger.yaml'));

export { swaggerDocument };
