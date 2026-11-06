import { siteInfo } from '../siteInfo'

export default function Privacy() {
  return (
    <article className="legal">
      <h1>Privacy policy</h1>
      <p className="legal-date">Last updated: 6 November 2026</p>

      <section>
        <h2>Who we are</h2>
        <p>
          {siteInfo.name} runs this website and delivers groceries from our branches. This policy
          explains what personal information we collect when you use the site, and what we do with
          it.
        </p>
        <p>
          You can contact us at {siteInfo.email} or on {siteInfo.phone}. Our address is{' '}
          {siteInfo.address}.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            Account details: your name, email address, password, and phone number if you give one.
            Passwords are stored in a scrambled form, so we cannot read them.
          </li>
          <li>
            Order details: the items you order, the branch, the total, your delivery address, the
            phone number for delivery, any notes you add, and the status and time of the order.
          </li>
          <li>
            Payment records: a payment reference and whether the payment succeeded. You enter your
            card or mobile money details on the Paystack payment page. We never see or store them.
          </li>
          <li>
            Browser storage: the site keeps you logged in and remembers your cart by saving small
            pieces of data in your browser. We do not use this to track you or to show adverts.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To create and manage your account.</li>
          <li>To take, prepare, and deliver your orders.</li>
          <li>To confirm your payments.</li>
          <li>To contact you about an order.</li>
          <li>To keep business and accounting records that the law requires.</li>
          <li>To keep the site secure.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for advertising.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <ul>
          <li>
            Paystack, which processes payments for us. It receives your email address and the amount
            of your order. Its own privacy policy applies to the payment page.
          </li>
          <li>
            Our staff at the branch that prepares and delivers your order. They see your name,
            delivery phone number, address, and order.
          </li>
          <li>The service providers that host this website and its database.</li>
          <li>The authorities, where the law requires us to.</li>
        </ul>
      </section>

      <section>
        <h2>Keeping your information safe</h2>
        <p>
          We use encrypted connections, we store passwords in a scrambled form, and only logged in
          staff can see orders. No system is perfectly secure, so we cannot promise that nothing will
          ever go wrong, but we take care to protect what you give us.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your account details while your account exists. We keep order and payment records
          for as long as we need them for accounting, disputes, and legal requirements. If you ask us
          to delete your account, we will delete or anonymise what we can, except for records we are
          required to keep.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Under the Data Protection Act, 2012 (Act 843) of Ghana, you can ask us what personal
          information we hold about you, ask us to correct it, ask us to delete it, and object to how
          we use it. Contact us using the details above and we will respond. You can also complain to
          the Data Protection Commission of Ghana.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          This site is not meant for people under 18 to use without a parent or guardian.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we change this policy, we will update the date at the top of this page.
        </p>
      </section>
    </article>
  )
}