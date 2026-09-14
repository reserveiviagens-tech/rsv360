import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/** Aruanda C3 — form is not persisted (MODULE_DEAD /api/cloud). */
export default function StorageSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        badge="Cloud"
        title="Configurações de storage"
        description="Provider, quota e credenciais."
      />
      <p
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        role="status"
      >
        Não persistido — módulo cloud arquivado (`/api/cloud` → 410). Este formulário não salva.
      </p>
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Input placeholder="s3 / minio" disabled />
          </div>
          <div className="space-y-2">
            <Label>Bucket</Label>
            <Input placeholder="rsv360-files" disabled />
          </div>
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input placeholder="https://..." disabled />
          </div>
          <div className="space-y-2">
            <Label>Região</Label>
            <Input placeholder="sa-east-1" disabled />
          </div>
          <Button className="md:col-span-2" disabled type="button">
            Salvar configuração (indisponível)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
