# webhook-objects

> Note: These examples are built with AI, and are designed to be "food for thought", not recommendations that are fit for production use.

A collection of quick examples for using Webhook Objects within [Gather 2.0](https://gather.town).

## Smart Objects

Each example drives a **Smart Object** — a Gather map object whose state is set by signed HTTP webhooks (via [`@gathertown/webhook-object-sdk`](https://www.npmjs.com/package/@gathertown/webhook-object-sdk)). For the full model — presets, capabilities, and every event with its arguments — see the [Smart Objects reference](./docs/reference.md).

## Getting Started

To get started, you can explore our individual packages:

* [`@webhook-objects/now-playing-inbox`](./packages/now-playing-inbox)
* [`@webhook-objects/gh-prs-inbox`](./packages/gh-prs-inbox)
* [`@webhook-objects/claude-status`](./packages/claude-status)
* [`@webhook-objects/low-battery-switch`](./packages/low-battery-switch)

## Support

We're committed to helping you get the most out of webhook-objects. That said, the examples provided here are just that - examples. We recommend using these as a jumping off point, not a recipe for production-quality solutions. 

Further - While PRs are welcome, they're reviewed on a best-effort basis. If you have specific questions, please reach out to our support team directly via [gather.town/contact-us](https://gather.town/contact-us).

## License

This project is dual licensed under [MIT](./LICENSE-MIT) and [Apache 2.0](./LICENSE-APACHE), at your option.
