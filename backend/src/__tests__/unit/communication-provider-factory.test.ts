describe('CommunicationProviderFactory — provider SMTP', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.EMAIL_PROVIDER;
  });

  it('deve carregar o factory e criar SMTP sem exigir SendGrid quando SMTP é o provider', async () => {
    delete process.env.EMAIL_PROVIDER;

    const { CommunicationProviderFactory } = await import(
      '../../../server/modules/communication/providers/factory'
    );

    const provider =
      CommunicationProviderFactory.createProviderByName('email', 'smtp');

    expect(provider).toBeDefined();
    expect(provider?.email).toBeDefined();
    expect(provider?.email?.name).toBe('smtp');
  });
});
