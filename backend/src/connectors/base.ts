import { IConnector, DataSource, FetchParams } from '../types';

export const connectorRegistry = new Map<DataSource, IConnector>();

export function registerConnector(connector: IConnector): void {
  connectorRegistry.set(connector.name, connector);
  console.log(`✓ Registered connector: ${connector.name}`);
}

export function getConnector(name: DataSource): IConnector | undefined {
  return connectorRegistry.get(name);
}

export function getAllConnectors(): IConnector[] {
  return Array.from(connectorRegistry.values());
}

export async function syncAllConnectors(merchant_id: string) {
  const results = [];
  for (const connector of getAllConnectors()) {
    const result = await connector.sync({ merchant_id });
    results.push(result);
  }
  return results;
}
