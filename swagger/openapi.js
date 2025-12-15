// web/openapi.js
/** @type {import('openapi-types').OpenAPIV3.Document} */
const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Business Messenger API',
    version: '0.1.0',
    description: 'MVP API specification for B2B Russia<->China business messenger',
  },
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Production server (placeholder)',
    },
    {
      url: 'http://localhost:8000',
      description: 'Local dev server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // === Base/common ===
      Id: {
        type: 'string',
        format: 'uuid',
        description: 'Entity identifier (UUID or similar)',
      },

      // === Auth / User / Org ===
      User: {
        type: 'object',
        required: ['id', 'email', 'name'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          phone: { type: 'string', nullable: true },
          orgId: { $ref: '#/components/schemas/Id', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      OrganizationRole: {
        type: 'string',
        enum: ['buyer', 'supplier', 'both'],
      },

      KycStatus: {
        type: 'string',
        description: 'KYC status of individual user',
        enum: ['not_started', 'pending', 'verified', 'rejected'],
      },

      KybStatus: {
        type: 'string',
        description: 'KYB (Know Your Business) status of organization',
        enum: ['not_started', 'pending', 'verified', 'rejected'],
      },

      Organization: {
        type: 'object',
        required: ['id', 'name', 'country', 'role'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          name: { type: 'string' },
          country: {
            type: 'string',
            description: 'ISO 3166-1 alpha-2 country code, e.g. RU, CN',
          },
          role: { $ref: '#/components/schemas/OrganizationRole' },
          kybStatus: {
            $ref: '#/components/schemas/KybStatus',
            description: 'Compliance verification status of organization',
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      AuthRegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name', 'orgName', 'orgCountry', 'orgRole'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', description: 'User display name' },
          orgName: { type: 'string' },
          orgCountry: { type: 'string', description: 'ISO country code' },
          orgRole: { $ref: '#/components/schemas/OrganizationRole' },
        },
      },

      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },

      AuthTokens: {
        type: 'object',
        required: ['accessToken', 'refreshToken', 'expiresIn'],
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: {
            type: 'integer',
            description: 'Access token lifetime in seconds',
          },
        },
      },

      AuthMeResponse: {
        type: 'object',
        required: ['user', 'org'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
          org: { $ref: '#/components/schemas/Organization' },
        },
      },

      // === Products ===
      CurrencyCode: {
        type: 'string',
        description: 'ISO 4217 currency code, e.g. CNY, RUB, USD',
      },

      UnitOfMeasure: {
        type: 'string',
        enum: ['piece', 'kg', 'ton', 'package', 'm3', 'other'],
      },

      Product: {
        type: 'object',
        required: ['id', 'orgId', 'name', 'baseCurrency', 'basePrice', 'unit'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          orgId: { $ref: '#/components/schemas/Id' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          hsCode: {
            type: 'string',
            nullable: true,
            description: 'HS code (if known)',
          },
          baseCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          basePrice: { type: 'number', format: 'double' },
          unit: { $ref: '#/components/schemas/UnitOfMeasure' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      ProductCreateRequest: {
        type: 'object',
        required: ['name', 'baseCurrency', 'basePrice', 'unit'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          hsCode: { type: 'string', nullable: true },
          baseCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          basePrice: { type: 'number', format: 'double' },
          unit: { $ref: '#/components/schemas/UnitOfMeasure' },
        },
      },

      ProductUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          hsCode: { type: 'string', nullable: true },
          baseCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          basePrice: { type: 'number', format: 'double' },
          unit: { $ref: '#/components/schemas/UnitOfMeasure' },
        },
      },

      // === RFQ / Offer / Order / Deal ===
      RFQStatus: {
        type: 'string',
        enum: ['draft', 'sent', 'responded', 'closed'],
      },

      RFQItem: {
        type: 'object',
        required: ['name', 'qty', 'unit'],
        properties: {
          productId: {
            $ref: '#/components/schemas/Id',
            nullable: true,
            description: 'Optional reference to existing product',
          },
          name: {
            type: 'string',
            description:
              'Short name/description of the requested item (used if no productId)',
          },
          qty: { type: 'number', format: 'double' },
          unit: { $ref: '#/components/schemas/UnitOfMeasure' },
          targetPrice: { type: 'number', format: 'double', nullable: true },
          notes: { type: 'string', nullable: true },
        },
      },

      RFQ: {
        type: 'object',
        required: ['id', 'buyerOrgId', 'status', 'items', 'createdAt'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          buyerOrgId: { $ref: '#/components/schemas/Id' },
          supplierOrgId: {
            $ref: '#/components/schemas/Id',
            nullable: true,
            description: 'Target supplier organization, if specified',
          },
          status: { $ref: '#/components/schemas/RFQStatus' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/RFQItem' },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      RFQCreateRequest: {
        type: 'object',
        required: ['supplierOrgId', 'items'],
        properties: {
          supplierOrgId: { $ref: '#/components/schemas/Id' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/RFQItem' },
            minItems: 1,
          },
        },
      },

      RFQUpdateRequest: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/RFQItem' },
          },
        },
      },

      OfferStatus: {
        type: 'string',
        enum: ['sent', 'accepted', 'rejected'],
      },

      OfferItem: {
        type: 'object',
        required: ['name', 'qty', 'unit', 'price', 'subtotal'],
        properties: {
          rfqItemIndex: {
            type: 'integer',
            nullable: true,
            description:
              'Optional index of related RFQ item (0-based), for mapping',
          },
          productId: {
            $ref: '#/components/schemas/Id',
            nullable: true,
          },
          name: { type: 'string' },
          qty: { type: 'number', format: 'double' },
          unit: { $ref: '#/components/schemas/UnitOfMeasure' },
          price: { type: 'number', format: 'double' },
          subtotal: { type: 'number', format: 'double' },
        },
      },

      Offer: {
        type: 'object',
        required: [
          'id',
          'rfqId',
          'supplierOrgId',
          'status',
          'currency',
          'items',
          'createdAt',
        ],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          rfqId: { $ref: '#/components/schemas/Id' },
          supplierOrgId: { $ref: '#/components/schemas/Id' },
          status: { $ref: '#/components/schemas/OfferStatus' },
          currency: { $ref: '#/components/schemas/CurrencyCode' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OfferItem' },
          },
          incoterms: {
            type: 'string',
            nullable: true,
            description: 'e.g. FOB, CIF, EXW (Incoterms 2020)',
          },
          paymentTerms: {
            type: 'string',
            nullable: true,
            description: 'e.g. 30% prepayment, 70% before shipment',
          },
          validUntil: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      OfferCreateRequest: {
        type: 'object',
        required: ['currency', 'items'],
        properties: {
          currency: { $ref: '#/components/schemas/CurrencyCode' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OfferItem' },
            minItems: 1,
          },
          incoterms: { type: 'string', nullable: true },
          paymentTerms: { type: 'string', nullable: true },
          validUntil: { type: 'string', format: 'date-time', nullable: true },
        },
      },

      OrderStatus: {
        type: 'string',
        enum: ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      },

      OrderItem: {
        type: 'object',
        required: ['name', 'qty', 'unit', 'price', 'subtotal'],
        properties: {
          productId: { $ref: '#/components/schemas/Id', nullable: true },
          name: { type: 'string' },
          qty: { type: 'number', format: 'double' },
          unit: { $ref: '#/components/schemas/UnitOfMeasure' },
          price: { type: 'number', format: 'double' },
          subtotal: { type: 'number', format: 'double' },
        },
      },

      Order: {
        type: 'object',
        required: [
          'id',
          'buyerOrgId',
          'supplierOrgId',
          'offerId',
          'status',
          'currency',
          'items',
          'totalAmount',
          'createdAt',
        ],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          buyerOrgId: { $ref: '#/components/schemas/Id' },
          supplierOrgId: { $ref: '#/components/schemas/Id' },
          offerId: { $ref: '#/components/schemas/Id' },
          status: { $ref: '#/components/schemas/OrderStatus' },
          currency: { $ref: '#/components/schemas/CurrencyCode' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          totalAmount: { type: 'number', format: 'double' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      DealStatus: {
        type: 'string',
        enum: ['negotiation', 'ordered', 'paid_partially', 'paid', 'closed'],
      },

      Deal: {
        type: 'object',
        required: ['id', 'rfqId', 'offerId', 'orderId', 'status', 'mainCurrency'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          rfqId: { $ref: '#/components/schemas/Id' },
          offerId: { $ref: '#/components/schemas/Id' },
          orderId: { $ref: '#/components/schemas/Id' },
          status: { $ref: '#/components/schemas/DealStatus' },
          mainCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          // Поле summary — зарезервировано под будущую юнит-экономику
          summary: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description: 'Optional aggregated metrics (to extend later)',
          },
        },
      },

      DealAggregatedView: {
        type: 'object',
        required: ['deal', 'rfq', 'offer', 'order'],
        properties: {
          deal: { $ref: '#/components/schemas/Deal' },
          rfq: { $ref: '#/components/schemas/RFQ' },
          offer: { $ref: '#/components/schemas/Offer' },
          order: { $ref: '#/components/schemas/Order' },
        },
      },
            // === Chat & Messages ===
      Chat: {
        type: 'object',
        required: ['id', 'dealId', 'participants', 'createdAt'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          dealId: {
            $ref: '#/components/schemas/Id',
            description: 'Deal this chat belongs to',
          },
          participants: {
            type: 'array',
            description: 'Participants (user IDs) of the chat',
            items: { $ref: '#/components/schemas/Id' },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      MessageTranslation: {
        type: 'object',
        description: 'Auto or manual translation of a message',
        required: ['lang', 'text', 'autoTranslated'],
        properties: {
          lang: {
            type: 'string',
            description: 'BCP-47 language code, e.g. ru, zh-CN, en',
          },
          text: { type: 'string' },
          autoTranslated: { type: 'boolean' },
          qualityScore: {
            type: 'number',
            format: 'double',
            nullable: true,
            description: 'Optional quality/confidence score of translation',
          },
        },
      },

      Message: {
        type: 'object',
        required: ['id', 'chatId', 'senderId', 'text', 'originalLang', 'createdAt'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          chatId: { $ref: '#/components/schemas/Id' },
          senderId: {
            $ref: '#/components/schemas/Id',
            description: 'User who sent the message',
          },
          text: { type: 'string' },
          originalLang: {
            type: 'string',
            description: 'Language of original text (BCP-47 code)',
          },
          translations: {
            type: 'array',
            description:
              'List of translations available for this message (server may store subset)',
            items: { $ref: '#/components/schemas/MessageTranslation' },
            nullable: true,
          },
          createdAt: { type: 'string', format: 'date-time' },
          editedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },

      MessageCreateRequest: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          lang: {
            type: 'string',
            nullable: true,
            description:
              'Optional original language code; if omitted, server may auto-detect',
          },
        },
      },

      MessageTranslateRequest: {
        type: 'object',
        required: ['targetLang'],
        properties: {
          targetLang: {
            type: 'string',
            description: 'Target language code for translation, e.g. ru, zh-CN',
          },
        },
      },

      MessageTranslateResponse: {
        type: 'object',
        required: ['text', 'targetLang'],
        properties: {
          text: { type: 'string' },
          targetLang: { type: 'string' },
        },
      },

            // === Wallets / FX / Payments ===
      Wallet: {
        type: 'object',
        required: ['id', 'orgId', 'currency', 'balance'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          orgId: { $ref: '#/components/schemas/Id' },
          currency: { $ref: '#/components/schemas/CurrencyCode' },
          balance: {
            type: 'number',
            format: 'double',
            description: 'Available balance in this wallet currency',
          },
          blockedAmount: {
            type: 'number',
            format: 'double',
            description: 'Temporarily blocked amount (e.g., for pending payments)',
            default: 0,
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      FXRatesResponse: {
        type: 'object',
        required: ['base', 'rates', 'timestamp'],
        properties: {
          base: { $ref: '#/components/schemas/CurrencyCode' },
          rates: {
            type: 'object',
            additionalProperties: {
              type: 'number',
              format: 'double',
            },
            description: 'Map of currency code to rate',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Time when rates were fetched/calculated',
          },
        },
      },

      FXQuoteRequest: {
        type: 'object',
        required: ['fromCurrency', 'toCurrency', 'amount'],
        properties: {
          fromCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          toCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          amount: {
            type: 'number',
            format: 'double',
            description: 'Amount in fromCurrency',
          },
        },
      },

      FXQuoteResponse: {
        type: 'object',
        required: ['quoteId', 'fromCurrency', 'toCurrency', 'rate', 'expiresAt'],
        properties: {
          quoteId: {
            type: 'string',
            description: 'Identifier of locked FX quote to be used in payment',
          },
          fromCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          toCurrency: { $ref: '#/components/schemas/CurrencyCode' },
          rate: {
            type: 'number',
            format: 'double',
            description:
              'Rate from fromCurrency to toCurrency (1 fromCurrency = rate toCurrency)',
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'When this quote becomes invalid',
          },
        },
      },

      PaymentStatus: {
        type: 'string',
        enum: ['pending', 'completed', 'failed'],
      },

      Payment: {
        type: 'object',
        required: [
          'id',
          'dealId',
          'payerOrgId',
          'payeeOrgId',
          'amount',
          'currency',
          'status',
          'createdAt',
        ],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          dealId: {
            $ref: '#/components/schemas/Id',
            description: 'Deal this payment belongs to',
          },
          payerOrgId: { $ref: '#/components/schemas/Id' },
          payeeOrgId: { $ref: '#/components/schemas/Id' },
          amount: {
            type: 'number',
            format: 'double',
          },
          currency: { $ref: '#/components/schemas/CurrencyCode' },
          status: { $ref: '#/components/schemas/PaymentStatus' },
          fxQuoteId: {
            type: 'string',
            nullable: true,
            description:
              'Optional FX quote used if payer and payee wallets have different currencies',
          },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          failureReason: {
            type: 'string',
            nullable: true,
            description: 'If status=failed, reason explanation',
          },
        },
      },

      PaymentCreateRequest: {
        type: 'object',
        required: ['dealId', 'amount', 'currency'],
        properties: {
          dealId: { $ref: '#/components/schemas/Id' },
          amount: {
            type: 'number',
            format: 'double',
          },
          currency: { $ref: '#/components/schemas/CurrencyCode' },
          fxQuoteId: {
            type: 'string',
            nullable: true,
            description:
              'FX quote identifier if payment currency differs from payer wallet base currency',
          },
        },
      },

            // === Analytics / Deal Unit Economics ===
      DealCostBreakdown: {
        type: 'object',
        description: 'Detailed breakdown of deal costs',
        properties: {
          productCost: {
            type: 'number',
            format: 'double',
            description: 'Total cost of goods (COGS) in target currency',
            default: 0,
          },
          logisticsCost: {
            type: 'number',
            format: 'double',
            description: 'Total logistics cost (freight, local delivery, etc.)',
            default: 0,
          },
          dutiesTaxes: {
            type: 'number',
            format: 'double',
            description: 'Total duties, VAT and other import/export taxes',
            default: 0,
          },
          fxCost: {
            type: 'number',
            format: 'double',
            description: 'Total FX conversion cost/slippage for this deal',
            default: 0,
          },
          commissions: {
            type: 'number',
            format: 'double',
            description: 'Platform/banking/other commissions',
            default: 0,
          },
          otherCost: {
            type: 'number',
            format: 'double',
            description: 'Any additional cost not covered above',
            default: 0,
          },
        },
      },

      DealUnitEconomicsResult: {
        type: 'object',
        description:
          'Unit economics summary for a specific deal (MVP - simple aggregated view)',
        required: [
          'dealId',
          'currency',
          'revenue',
          'totalCost',
          'grossMarginAbs',
          'grossMarginPct',
          'costBreakdown',
        ],
        properties: {
          dealId: { $ref: '#/components/schemas/Id' },
          currency: {
            $ref: '#/components/schemas/CurrencyCode',
            description:
              'Reporting currency for all amounts (usually mainCurrency of deal)',
          },
          revenue: {
            type: 'number',
            format: 'double',
            description: 'Total deal revenue (order total) in reporting currency',
          },
          totalCost: {
            type: 'number',
            format: 'double',
            description: 'Sum of all cost components in reporting currency',
          },
          grossMarginAbs: {
            type: 'number',
            format: 'double',
            description: 'Absolute gross margin = revenue - totalCost',
          },
          grossMarginPct: {
            type: 'number',
            format: 'double',
            description: 'Gross margin percentage (0-100)',
          },
          costBreakdown: {
            $ref: '#/components/schemas/DealCostBreakdown',
          },
          notes: {
            type: 'string',
            nullable: true,
            description:
              'Optional human-readable notes/explanation (e.g. main drivers of cost)',
          },
        },
      },

            // === Notifications ===
      NotificationType: {
        type: 'string',
        description: 'High-level type of notification',
        enum: [
          'message',
          'offer_status',
          'order_status',
          'deal_status',
          'payment_status',
          'system',
        ],
      },

      NotificationEntityType: {
        type: 'string',
        description: 'Type of entity that notification is associated with',
        enum: ['deal', 'rfq', 'offer', 'order', 'payment', 'message', 'system'],
      },

      Notification: {
        type: 'object',
        required: [
          'id',
          'type',
          'entityType',
          'entityId',
          'text',
          'read',
          'createdAt',
        ],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          type: { $ref: '#/components/schemas/NotificationType' },
          entityType: { $ref: '#/components/schemas/NotificationEntityType' },
          entityId: {
            $ref: '#/components/schemas/Id',
            description: 'ID of related entity (deal, order, payment, etc.)',
          },
          text: {
            type: 'string',
            description: 'Short description for UI (already localized or ready for display)',
          },
          data: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description: 'Optional structured payload with extra data for client',
          },
          read: {
            type: 'boolean',
            description: 'Whether notification was read by current user',
          },
          createdAt: { type: 'string', format: 'date-time' },
          readAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },

            // === Files & Documents ===
      File: {
        type: 'object',
        description: 'Stored file metadata',
        required: ['id', 'filename', 'mimeType', 'size', 'createdAt'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          filename: { type: 'string' },
          mimeType: { type: 'string' },
          size: {
            type: 'integer',
            format: 'int64',
            description: 'File size in bytes',
          },
          url: {
            type: 'string',
            nullable: true,
            description:
              'Optional direct URL for download (if applicable; optional for security reasons)',
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      DocumentType: {
        type: 'string',
        description: 'Type of deal-related document',
        enum: [
          'contract',
          'purchase_order',
          'invoice',
          'packing_list',
          'specification',
          'other',
        ],
      },

      Document: {
        type: 'object',
        description: 'Business document linked to a deal',
        required: ['id', 'dealId', 'type', 'fileId', 'createdAt'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          dealId: {
            $ref: '#/components/schemas/Id',
            description: 'Deal this document is associated with',
          },
          type: { $ref: '#/components/schemas/DocumentType' },
          title: {
            type: 'string',
            nullable: true,
            description: 'Optional human-readable title for the document',
          },
          fileId: {
            $ref: '#/components/schemas/Id',
            description: 'File entity that stores actual content',
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      DealDocumentCreateRequest: {
        type: 'object',
        required: ['type', 'fileId'],
        properties: {
          type: { $ref: '#/components/schemas/DocumentType' },
          title: {
            type: 'string',
            nullable: true,
          },
          fileId: { $ref: '#/components/schemas/Id' },
        },
      },

            // === Compliance (KYC/KYB) ===
      KYBDocumentType: {
        type: 'string',
        description: 'Type of document required/used for KYB verification',
        enum: [
          'registration_certificate',
          'tax_certificate',
          'charter',
          'director_id',
          'bank_statement',
          'other',
        ],
      },

      KYBDocument: {
        type: 'object',
        description: 'Uploaded document for KYB verification',
        required: ['id', 'type', 'fileId', 'uploadedAt'],
        properties: {
          id: { $ref: '#/components/schemas/Id' },
          type: { $ref: '#/components/schemas/KYBDocumentType' },
          fileId: { $ref: '#/components/schemas/Id' },
          uploadedAt: { type: 'string', format: 'date-time' },
        },
      },

      KYBProfile: {
        type: 'object',
        description: 'KYB profile of organization (MVP simplified)',
        required: ['orgId', 'status', 'requiredDocs', 'submittedDocs'],
        properties: {
          orgId: { $ref: '#/components/schemas/Id' },
          status: { $ref: '#/components/schemas/KybStatus' },
          requiredDocs: {
            type: 'array',
            description: 'Types of documents required for this org',
            items: { $ref: '#/components/schemas/KYBDocumentType' },
          },
          submittedDocs: {
            type: 'array',
            description: 'Documents already uploaded for KYB',
            items: { $ref: '#/components/schemas/KYBDocument' },
          },
          lastReviewedAt: { type: 'string', format: 'date-time', nullable: true },
          reviewerComment: {
            type: 'string',
            nullable: true,
            description: 'Optional comment from compliance officer (for rejected/pending)',
          },
        },
      },

      KYBSubmitRequest: {
        type: 'object',
        description:
          'MVP: link already uploaded files as KYB documents and basic company compliance data',
        properties: {
          // базовые поля — на будущее, можно временно игнорировать в реализации
          legalName: {
            type: 'string',
            nullable: true,
            description: 'Legal registered name of organization (if differs from display name)',
          },
          registrationNumber: {
            type: 'string',
            nullable: true,
            description: 'Local business registration number/OGRN/etc.',
          },
          taxId: {
            type: 'string',
            nullable: true,
            description: 'Taxpayer ID (INN or local equivalent)',
          },
          address: {
            type: 'string',
            nullable: true,
          },

          documents: {
            type: 'array',
            description: 'Documents to attach to KYB profile (files must be uploaded first)',
            items: {
              type: 'object',
              required: ['type', 'fileId'],
              properties: {
                type: { $ref: '#/components/schemas/KYBDocumentType' },
                fileId: { $ref: '#/components/schemas/Id' },
              },
            },
          },
        },
      },
    },
  },

  security: [
    {
      BearerAuth: [],
    },
  ],

  paths: {
    // ===== Auth =====
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register user and organization',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthRegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User and organization created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['user', 'org', 'tokens'],
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    org: { $ref: '#/components/schemas/Organization' },
                    tokens: { $ref: '#/components/schemas/AuthTokens' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
        security: [],
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['user', 'org', 'tokens'],
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    org: { $ref: '#/components/schemas/Organization' },
                    tokens: { $ref: '#/components/schemas/AuthTokens' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
        security: [],
      },
    },

    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthTokens' },
              },
            },
          },
          '401': { description: 'Invalid refresh token' },
        },
        security: [],
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user and organization',
        responses: {
          '200': {
            description: 'Current user info',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthMeResponse' },
              },
            },
          },
        },
      },
    },

    // ===== Organization =====
    '/orgs/me': {
      get: {
        tags: ['Organization'],
        summary: 'Get current user organization',
        responses: {
          '200': {
            description: 'Organization',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Organization' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Organization'],
        summary: 'Update current user organization',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  country: { type: 'string' },
                  role: { $ref: '#/components/schemas/OrganizationRole' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated organization',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Organization' },
              },
            },
          },
        },
      },
    },

    '/orgs/me/compliance': {
      get: {
        tags: ['Compliance'],
        summary: 'Get KYB compliance profile for current user organization',
        description:
          'Returns current KYB status, required documents list, and already submitted documents.',
        responses: {
          '200': {
            description: 'KYB profile for current organization',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/KYBProfile' },
              },
            },
          },
          '404': {
            description: 'Organization not found (should not happen for authenticated user)',
          },
        },
      },
      post: {
        tags: ['Compliance'],
        summary: 'Submit/update KYB information and documents for current organization (MVP)',
        description:
          'Client first uploads files via /files, then calls this endpoint to link files as KYB documents and optionally provide basic company data.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/KYBSubmitRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated KYB profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/KYBProfile' },
              },
            },
          },
          '400': { description: 'Validation error (e.g. missing required docs)' },
        },
      },
    },

    // ===== Products =====
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        parameters: [
          {
            name: 'orgId',
            in: 'query',
            schema: { type: 'string' },
            required: false,
            description: 'Filter by organization ID',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            required: false,
            description: 'Search by name/description',
          },
        ],
        responses: {
          '200': {
            description: 'List of products',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product for current organization',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created product',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },

    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Product',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          '404': { description: 'Product not found' },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update product',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated product',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          '404': { description: 'Product not found' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '204': { description: 'Product deleted' },
          '404': { description: 'Product not found' },
        },
      },
    },

    // ===== RFQs =====
    '/rfqs': {
      get: {
        tags: ['RFQ'],
        summary: 'List RFQs for current org as buyer or supplier',
        parameters: [
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string', enum: ['buyer', 'supplier'] },
            required: true,
          },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/RFQStatus' },
            required: false,
          },
        ],
        responses: {
          '200': {
            description: 'List of RFQs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RFQ' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['RFQ'],
        summary: 'Create RFQ',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RFQCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'RFQ created (status=draft or sent)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RFQ' },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },

    '/rfqs/{id}': {
      get: {
        tags: ['RFQ'],
        summary: 'Get RFQ by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'RFQ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RFQ' },
              },
            },
          },
          '404': { description: 'RFQ not found' },
        },
      },
      patch: {
        tags: ['RFQ'],
        summary: 'Update RFQ (allowed in draft/sent)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RFQUpdateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated RFQ',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RFQ' },
              },
            },
          },
          '404': { description: 'RFQ not found' },
        },
      },
    },

    '/rfqs/{id}/send': {
      post: {
        tags: ['RFQ'],
        summary: 'Send RFQ to supplier (status -> sent)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'RFQ sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RFQ' },
              },
            },
          },
          '404': { description: 'RFQ not found' },
          '409': { description: 'Invalid RFQ state' },
        },
      },
    },

    // ===== Offers =====
    '/rfqs/{id}/offers': {
      get: {
        tags: ['Offers'],
        summary: 'List offers for RFQ',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'List of offers',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Offer' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Offers'],
        summary: 'Create offer for RFQ (supplier side)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OfferCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Offer created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Offer' },
              },
            },
          },
          '404': { description: 'RFQ not found' },
        },
      },
    },

    '/offers/{id}': {
      get: {
        tags: ['Offers'],
        summary: 'Get offer by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Offer',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Offer' },
              },
            },
          },
          '404': { description: 'Offer not found' },
        },
      },
    },

    '/offers/{id}/accept': {
      post: {
        tags: ['Offers'],
        summary: 'Accept offer (creates order & deal)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Offer accepted, order and deal created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['offer', 'order', 'deal'],
                  properties: {
                    offer: { $ref: '#/components/schemas/Offer' },
                    order: { $ref: '#/components/schemas/Order' },
                    deal: { $ref: '#/components/schemas/Deal' },
                  },
                },
              },
            },
          },
          '404': { description: 'Offer not found' },
          '409': { description: 'Invalid offer state' },
        },
      },
    },

    '/offers/{id}/reject': {
      post: {
        tags: ['Offers'],
        summary: 'Reject offer',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Offer rejected',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Offer' },
              },
            },
          },
          '404': { description: 'Offer not found' },
          '409': { description: 'Invalid offer state' },
        },
      },
    },

    // ===== Orders =====
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List orders for current organization',
        parameters: [
          {
            name: 'role',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['buyer', 'supplier'] },
          },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/OrderStatus' },
          },
        ],
        responses: {
          '200': {
            description: 'List of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
        },
      },
    },

    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Order',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
              },
            },
          },
          '404': { description: 'Order not found' },
        },
      },
    },

    // ===== Deals =====
    '/deals': {
      get: {
        tags: ['Deals'],
        summary: 'List deals for current organization',
        parameters: [
          {
            name: 'role',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['buyer', 'supplier'] },
          },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/DealStatus' },
          },
        ],
        responses: {
          '200': {
            description: 'List of deals',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Deal' },
                },
              },
            },
          },
        },
      },
    },

    '/deals/{id}': {
      get: {
        tags: ['Deals'],
        summary: 'Get aggregated deal view (deal + rfq + offer + order)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Aggregated deal view',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DealAggregatedView' },
              },
            },
          },
          '404': { description: 'Deal not found' },
        },
      },
    },

        // ===== Chats =====
    '/chats': {
      get: {
        tags: ['Chats'],
        summary: 'List chats for current user, optionally filtered by deal',
        parameters: [
          {
            name: 'dealId',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/Id' },
            description: 'Filter by deal ID',
          },
        ],
        responses: {
          '200': {
            description: 'List of chats',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Chat' },
                },
              },
            },
          },
        },
      },
    },

    '/chats/{chatId}': {
      get: {
        tags: ['Chats'],
        summary: 'Get chat by ID',
        parameters: [
          {
            name: 'chatId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Chat',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Chat' },
              },
            },
          },
          '404': { description: 'Chat not found' },
        },
      },
    },

    '/chats/{chatId}/messages': {
      get: {
        tags: ['Messages'],
        summary: 'List messages in chat',
        parameters: [
          {
            name: 'chatId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Pagination cursor (implementation-specific; optional for MVP)',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            description: 'Max messages to return',
          },
        ],
        responses: {
          '200': {
            description: 'List of messages',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Message' },
                },
              },
            },
          },
          '404': { description: 'Chat not found' },
        },
      },
      post: {
        tags: ['Messages'],
        summary: 'Send message to chat',
        parameters: [
          {
            name: 'chatId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MessageCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Message' },
              },
            },
          },
          '404': { description: 'Chat not found' },
        },
      },
    },

    '/chats/{chatId}/messages/{msgId}/translate': {
      post: {
        tags: ['Messages'],
        summary: 'Translate message to target language',
        parameters: [
          {
            name: 'chatId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
          {
            name: 'msgId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MessageTranslateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Translated message text',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageTranslateResponse' },
              },
            },
          },
          '404': { description: 'Chat or message not found' },
        },
      },
    },

        // ===== Wallets =====
    '/wallets': {
      get: {
        tags: ['Wallets'],
        summary: 'List wallets for organization',
        parameters: [
          {
            name: 'orgId',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/Id' },
            description:
              'Organization ID; if omitted, use current user organization',
          },
        ],
        responses: {
          '200': {
            description: 'List of wallets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Wallet' },
                },
              },
            },
          },
        },
      },
    },

    // ===== FX (exchange rates & quotes) =====
    '/fx/rates': {
      get: {
        tags: ['FX'],
        summary: 'Get current FX rates',
        parameters: [
          {
            name: 'base',
            in: 'query',
            required: true,
            schema: { $ref: '#/components/schemas/CurrencyCode' },
            description: 'Base currency code, e.g. RUB, CNY, USD',
          },
          {
            name: 'symbols',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Comma-separated list of target currencies; if omitted, return all available',
          },
        ],
        responses: {
          '200': {
            description: 'FX rates relative to base currency',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FXRatesResponse' },
              },
            },
          },
        },
      },
    },

    '/fx/quote': {
      post: {
        tags: ['FX'],
        summary: 'Get and lock FX quote for specific conversion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FXQuoteRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'FX quote created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FXQuoteResponse' },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },

    // ===== Payments =====
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments, optionally filtered by deal or organization role',
        parameters: [
          {
            name: 'dealId',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/Id' },
            description: 'Filter by deal ID',
          },
          {
            name: 'role',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['payer', 'payee'] },
            description:
              'Relative to current user organization; if omitted, return both as payer and payee',
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/PaymentStatus' },
          },
        ],
        responses: {
          '200': {
            description: 'List of payments',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Payment' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create payment for deal',
        description:
          'Debits payer organization wallet and credits payee organization wallet. FX conversion may be applied using fxQuoteId.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Payment' },
              },
            },
          },
          '400': { description: 'Validation error or insufficient funds' },
          '404': { description: 'Deal not found' },
        },
      },
    },

    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Payment',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Payment' },
              },
            },
          },
          '404': { description: 'Payment not found' },
        },
      },
    },

        // ===== Analytics / Unit Economics =====
    '/analytics/deals/{dealId}/unit-economics': {
      get: {
        tags: ['Analytics'],
        summary: 'Get unit economics summary for a deal',
        description:
          'Returns aggregated unit economics (revenue, full cost, margin) for specific deal. ' +
          'MVP implementation may compute it from order total, known costs, and historical FX.',
        parameters: [
          {
            name: 'dealId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Unit economics result for the deal',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DealUnitEconomicsResult' },
              },
            },
          },
          '404': { description: 'Deal not found' },
        },
      },
    },

        // ===== Notifications =====
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for current user',
        parameters: [
          {
            name: 'unreadOnly',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'If true, return only unread notifications',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            description: 'Maximum number of notifications to return',
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Optional pagination cursor (for loading older notifications)',
          },
        ],
        responses: {
          '200': {
            description: 'List of notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Notification' },
                },
              },
            },
          },
        },
      },
    },

    '/notifications/{id}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Notification updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Notification' },
              },
            },
          },
          '404': { description: 'Notification not found' },
        },
      },
    },

        // ===== Files =====
    '/files': {
      post: {
        tags: ['Files'],
        summary: 'Upload a file',
        description:
          'Upload a file and get metadata object. ' +
          'For MVP, simple multipart/form-data upload is enough.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File uploaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/File' },
              },
            },
          },
          '400': { description: 'Invalid upload request' },
        },
      },
    },

    '/files/{id}': {
      get: {
        tags: ['Files'],
        summary: 'Get file metadata by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'File metadata',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/File' },
              },
            },
          },
          '404': { description: 'File not found' },
        },
      },
    },

    '/files/{id}/download': {
      get: {
        tags: ['Files'],
        summary: 'Download file content',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Raw file content',
            content: {
              '*/*': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          '404': { description: 'File not found' },
        },
      },
    },

    // ===== Deal Documents =====
    '/deals/{dealId}/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents attached to deal',
        parameters: [
          {
            name: 'dealId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/DocumentType' },
            description: 'Optional filter by document type',
          },
        ],
        responses: {
          '200': {
            description: 'List of documents for deal',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Document' },
                },
              },
            },
          },
          '404': { description: 'Deal not found' },
        },
      },
      post: {
        tags: ['Documents'],
        summary: 'Attach document to deal (link existing file)',
        parameters: [
          {
            name: 'dealId',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DealDocumentCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Document created and linked to deal',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Document' },
              },
            },
          },
          '400': { description: 'Validation error' },
          '404': { description: 'Deal or File not found' },
        },
      },
    },

    '/documents/{id}': {
      get: {
        tags: ['Documents'],
        summary: 'Get document by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '200': {
            description: 'Document',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Document' },
              },
            },
          },
          '404': { description: 'Document not found' },
        },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete document',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { $ref: '#/components/schemas/Id' },
          },
        ],
        responses: {
          '204': { description: 'Document deleted' },
          '404': { description: 'Document not found' },
        },
      },
    },
  },
};

module.exports = openapi;