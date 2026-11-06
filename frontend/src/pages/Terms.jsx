import { siteInfo } from '../siteInfo'

export default function Terms() {
  return (
    <article className="legal">
      <h1>Terms and conditions</h1>
      <p className="legal-date">Last updated: 6 November 2026</p>

      <section>
        <h2>About these terms</h2>
        <p>
          These terms apply when you use this website, create an account, or place an order with{' '}
          {siteInfo.name}. By doing any of these, you agree to them. Please also read our privacy
          policy.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          Give us accurate details and keep your password private. You are responsible for what
          happens under your account. We may suspend an account that is misused.
        </p>
      </section>

      <section>
        <h2>Products and prices</h2>
        <p>
          All prices are in Ghana cedis (GH₵). The stock shown on the site is kept up to date, but it
          can change while you shop. If an item is no longer available when you check out, the order
          will be refused or we will contact you. Product descriptions are a guide, and fresh items
          can vary a little in size and appearance. If we find a pricing mistake, we may cancel the
          affected order and refund anything you paid.
        </p>
      </section>

      <section>
        <h2>Orders</h2>
        <p>
          Placing an order is a request to buy. You can follow its status under My orders. We may
          decline or cancel an order, for example when an item is unavailable or we cannot deliver to
          your address. If you have already paid, we will refund you.
        </p>
      </section>

      <section>
        <h2>Payment</h2>
        <p>
          You pay online through Paystack, using the payment methods it offers. An order stays marked
          Unpaid until your payment is confirmed, and we only prepare orders that are paid. We do not
          see or store your card or mobile money details. Paystack&apos;s own terms apply to the
          payment itself.
        </p>
      </section>

      <section>
        <h2>Delivery</h2>
        <p>
          We deliver to the address you enter at checkout. Please make sure your address and phone
          number are correct, because our rider may call you. Delivery times are estimates, not
          promises. We deliver within the areas our branches serve. If we cannot deliver to you, we
          will contact you and refund any payment. Any delivery fee is shown before you pay.
        </p>
      </section>

      <section>
        <h2>Cancellations and refunds</h2>
        <ul>
          <li>
            You can ask us to cancel an order before it is marked Out for delivery by contacting us.
          </li>
          <li>
            If an order is cancelled after you have paid, we refund the amount you paid. Refunds can
            take several working days to appear.
          </li>
          <li>
            If an item arrives damaged, wrong, or not as described, contact us on the day of delivery
            and we will replace it or refund it.
          </li>
        </ul>
      </section>

      <section>
        <h2>Using the site properly</h2>
        <p>
          Do not place false orders, try to break or get around the security of the site, or use it
          for anything unlawful.
        </p>
      </section>

      <section>
        <h2>Our responsibility</h2>
        <p>
          To the extent the law allows, we are not responsible for delays or losses caused by things
          outside our control, such as network problems or road conditions. Nothing in these terms
          takes away rights you have under Ghanaian consumer law.
        </p>
      </section>

      <section>
        <h2>Changes and governing law</h2>
        <p>
          We may update these terms, and we will change the date at the top of this page when we do.
          These terms are governed by the laws of Ghana.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          {siteInfo.name}, {siteInfo.address}. Email {siteInfo.email} or call {siteInfo.phone}.
        </p>
      </section>
    </article>
  )
}