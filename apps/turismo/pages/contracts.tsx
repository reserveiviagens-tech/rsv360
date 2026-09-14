import React, { useState } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  Edit,
  Plus,
  Search,
  DollarSign
} from 'lucide-react';

interface Contract {
  id: string;
  contractNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'signed' | 'active' | 'completed' | 'cancelled';
  signatureStatus: 'unsigned' | 'partially_signed' | 'fully_signed';
  createdAt: string;
  signedAt?: string;
  signedBy?: string;
  notes: string;
  terms: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  attachments: string[];
}

/** GATE-PROD-01: mock UI only — never treat as legally binding contracts. */
const ENABLE_CONTRATOS_MOCK = process.env.NEXT_PUBLIC_ENABLE_CONTRATOS_MOCK === 'true';
const CONTRATOS_DEMO_NOTICE =
  'DEMO — Esta funcionalidade não está disponível em produção. Contratos e assinaturas exibidos aqui são simulações e não têm validade jurídica.';

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: 'CON001',
      contractNumber: 'CON2025001',
      customerName: 'Maria Silva',
      customerEmail: 'maria.silva@email.com',
      customerPhone: '(11) 99999-9999',
      serviceType: 'Hotel',
      destination: 'Rio de Janeiro',
      startDate: '2025-08-15',
      endDate: '2025-08-20',
      totalAmount: 2500.00,
      status: 'signed',
      signatureStatus: 'fully_signed',
      createdAt: '2025-07-25',
      signedAt: '2025-07-26',
      signedBy: 'Maria Silva',
      notes: 'Contrato VIP com benefícios especiais',
      terms: 'Termos e condições especiais aplicáveis...',
      category: 'Premium',
      priority: 'high',
      tags: ['VIP', 'Premium', 'Hotel'],
      attachments: ['contrato.pdf', 'anexo1.pdf']
    },
    {
      id: 'CON002',
      contractNumber: 'CON2025002',
      customerName: 'Carlos Oliveira',
      customerEmail: 'carlos.oliveira@email.com',
      customerPhone: '(21) 88888-8888',
      serviceType: 'Pacote',
      destination: 'Fernando de Noronha',
      startDate: '2025-09-10',
      endDate: '2025-09-15',
      totalAmount: 4500.00,
      status: 'pending',
      signatureStatus: 'partially_signed',
      createdAt: '2025-07-26',
      notes: 'Pacote completo com passeios',
      terms: 'Termos padrão do pacote...',
      category: 'Standard',
      priority: 'medium',
      tags: ['Pacote', 'Ilha', 'Passeios'],
      attachments: ['contrato.pdf']
    },
    {
      id: 'CON003',
      contractNumber: 'CON2025003',
      customerName: 'Patrícia Lima',
      customerEmail: 'patricia.lima@email.com',
      customerPhone: '(31) 77777-7777',
      serviceType: 'Voo',
      destination: 'São Paulo',
      startDate: '2025-08-05',
      endDate: '2025-08-05',
      totalAmount: 800.00,
      status: 'active',
      signatureStatus: 'fully_signed',
      createdAt: '2025-07-20',
      signedAt: '2025-07-21',
      signedBy: 'Patrícia Lima',
      notes: 'Voo executivo',
      terms: 'Termos de voo...',
      category: 'Economy',
      priority: 'low',
      tags: ['Voo', 'Executivo'],
      attachments: ['contrato.pdf', 'termos.pdf']
    }
  ]);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    signed: 'bg-green-100 text-green-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const signatureStatusColors = {
    unsigned: 'bg-red-100 text-red-800',
    partially_signed: 'bg-yellow-100 text-yellow-800',
    fully_signed: 'bg-green-100 text-green-800'
  };


  const filteredContracts = contracts.filter(contract => {
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    const matchesSearch = contract.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.destination.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    pending: contracts.filter(c => c.status === 'pending').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    active: contracts.filter(c => c.status === 'active').length,
    completed: contracts.filter(c => c.status === 'completed').length,
    totalValue: contracts.reduce((sum, c) => sum + c.totalAmount, 0)
  };

  const _handleStatusChange = (contractId: string, newStatus: Contract['status']) => {
    setContracts(prev => prev.map(c => 
      c.id === contractId ? { ...c, status: newStatus } : c
    ));
  };

  const _handleSignatureStatusChange = (contractId: string, newStatus: Contract['signatureStatus']) => {
    setContracts(prev => prev.map(c => 
      c.id === contractId ? { ...c, signatureStatus: newStatus } : c
    ));
  };

  if (!ENABLE_CONTRATOS_MOCK) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white border border-amber-300 rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-2 mb-4">
            <FileText className="h-7 w-7 text-amber-600" aria-hidden />
            Gestão de Contratos
            <span className="rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-950">
              Indisponível
            </span>
          </h1>
          <p className="text-amber-900 font-medium" role="status">
            {CONTRATOS_DEMO_NOTICE}
          </p>
          <p className="mt-3 text-sm text-gray-600">
            GATE-PROD-01: esta tela não gera documento jurídico nem assinatura válida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div
          className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 font-medium"
          role="status"
        >
          {CONTRATOS_DEMO_NOTICE}
        </div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                <FileText className="h-8 w-8 text-amber-600" aria-hidden />
                Gestão de Contratos
                <span className="rounded border border-amber-400 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-950">
                  Demo · sem validade jurídica
                </span>
              </h1>
              <p className="text-gray-600 mt-2">
                Simulação de UI apenas (GATE-PROD-01). Status “assinado” abaixo é fictício — não constitui contrato.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center font-medium transition-colors"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Contrato
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Contratos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assinados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.signed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {stats.totalValue.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número, cliente ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="draft">Rascunho</option>
                <option value="pending">Pendente</option>
                <option value="signed">Assinado</option>
                <option value="active">Ativo</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contracts List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contrato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assinatura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.contractNumber}</div>
                        <div className="text-sm text-gray-500">{contract.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.customerName}</div>
                        <div className="text-sm text-gray-500">{contract.customerEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.serviceType}</div>
                        <div className="text-sm text-gray-500">{contract.destination}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {contract.totalAmount.toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[contract.status]}`}>
                        {contract.status === 'draft' && 'Rascunho'}
                        {contract.status === 'pending' && 'Pendente'}
                        {contract.status === 'signed' && 'Assinado'}
                        {contract.status === 'active' && 'Ativo'}
                        {contract.status === 'completed' && 'Concluído'}
                        {contract.status === 'cancelled' && 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${signatureStatusColors[contract.signatureStatus]}`}>
                        {contract.signatureStatus === 'unsigned' && 'Não Assinado'}
                        {contract.signatureStatus === 'partially_signed' && 'Parcialmente'}
                        {contract.signatureStatus === 'fully_signed' && 'Assinado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowCreateModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-purple-600 hover:text-purple-900">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contract Details Modal */}
        {showModal && selectedContract && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalhes do Contrato - {selectedContract.contractNumber}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contract Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informações do Contrato</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Número:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.contractNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Categoria:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[selectedContract.status]}`}>
                          {selectedContract.status === 'draft' && 'Rascunho'}
                          {selectedContract.status === 'pending' && 'Pendente'}
                          {selectedContract.status === 'signed' && 'Assinado'}
                          {selectedContract.status === 'active' && 'Ativo'}
                          {selectedContract.status === 'completed' && 'Concluído'}
                          {selectedContract.status === 'cancelled' && 'Cancelado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Criado em:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedContract.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informações do Cliente</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Nome:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.customerEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Telefone:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.customerPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informações do Serviço</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tipo:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.serviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Destino:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedContract.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Período:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedContract.startDate).toLocaleDateString('pt-BR')} - {new Date(selectedContract.endDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valor:</span>
                        <span className="text-sm font-medium text-gray-900">
                          R$ {selectedContract.totalAmount.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informações de Assinatura</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${signatureStatusColors[selectedContract.signatureStatus]}`}>
                          {selectedContract.signatureStatus === 'unsigned' && 'Não Assinado'}
                          {selectedContract.signatureStatus === 'partially_signed' && 'Parcialmente'}
                          {selectedContract.signatureStatus === 'fully_signed' && 'Assinado'}
                        </span>
                      </div>
                      {selectedContract.signedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Assinado em:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(selectedContract.signedAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {selectedContract.signedBy && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Assinado por:</span>
                          <span className="text-sm font-medium text-gray-900">{selectedContract.signedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms and Notes */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Termos e Observações</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Termos:</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedContract.terms}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observações:</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedContract.notes}</p>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Anexos</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedContract.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{attachment}</span>
                        <button className="text-blue-600 hover:text-blue-800">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedContract.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700">
                    <Download className="h-4 w-4 inline mr-2" />
                    Baixar PDF
                  </button>
                  <button className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700">
                    <Edit className="h-4 w-4 inline mr-2" />
                    Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractsPage; 