import { Card } from "@/components/ui/card";
import { VaultBrowser } from "@/components/vault/vault-browser";

export const dynamic = "force-dynamic";

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Vault</div>
        <div className="text-sm text-muted-foreground">
          Browse and preview markdown in your local Mission Control vault.
        </div>
      </div>

      <Card className="p-4">
        <VaultBrowser />
      </Card>
    </div>
  );
}
