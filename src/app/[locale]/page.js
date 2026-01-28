import Image from "next/image";
import styles from "./page.module.css";
import Form from "../../../components/Form/Form";
import LocaleSwitcher from "../../../components/LocaleSwitcher/LocaleSwitcher";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
          <LocaleSwitcher/>
          <Form/>
      </main>
    </div>
  );
}