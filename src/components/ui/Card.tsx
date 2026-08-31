'use client';

import React from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'flush';
export type CardPadding = 'normal' | 'tight';
export type CardTone = 'neutral' | 'positive' | 'warning' | 'risk';

interface CardContextValue {
  variant: CardVariant;
}

const CardContext = React.createContext<CardContextValue>({ variant: 'default' });

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ');
}

/* ============================================================
   Card
   ============================================================ */

type CardOwnProps = {
  /** `flush` = tanpa padding, untuk tabel/chart yang harus penuh sampai tepi. */
  variant?: CardVariant;
  padding?: CardPadding;
  /** Aktifkan hover-lift. Hanya untuk kartu yang benar-benar bisa diklik. */
  interactive?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
};

type CardProps = CardOwnProps &
  Omit<React.HTMLAttributes<HTMLElement>, keyof CardOwnProps> &
  Record<string, unknown>;

function CardRoot({
  variant = 'default',
  padding = 'normal',
  interactive = false,
  as,
  className,
  children,
  ...rest
}: CardProps) {
  const Component = (as || 'div') as React.ElementType;
  const ctx = React.useMemo<CardContextValue>(() => ({ variant }), [variant]);

  return (
    <CardContext.Provider value={ctx}>
      <Component
        className={cx(
          styles.card,
          variant === 'flush'
            ? styles.flush
            : padding === 'tight'
              ? styles.padTight
              : styles.padNormal,
          interactive && styles.interactive,
          className,
        )}
        {...rest}
      >
        {children}
      </Component>
    </CardContext.Provider>
  );
}

/* ============================================================
   Subkomponen
   ============================================================ */

type DivProps = React.HTMLAttributes<HTMLDivElement>;

type HeaderOwnProps = { as?: React.ElementType; className?: string; children?: React.ReactNode };
type HeaderProps = HeaderOwnProps &
  Omit<React.HTMLAttributes<HTMLElement>, keyof HeaderOwnProps> &
  Record<string, unknown>;

/** `as` dipakai kartu akordeon yang seluruh baris judulnya adalah tombol. */
function CardHeader({ as, className, children, ...rest }: HeaderProps) {
  const { variant } = React.useContext(CardContext);
  const Component = (as || 'div') as React.ElementType;
  return (
    <Component
      className={cx(styles.header, variant === 'flush' && styles.headerFlush, className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

interface CardIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Satu-satunya sumber warna aksen kartu. */
  tone?: CardTone;
}

const toneClass: Record<CardTone, string> = {
  neutral: styles.toneNeutral,
  positive: styles.tonePositive,
  warning: styles.toneWarning,
  risk: styles.toneRisk,
};

function CardIcon({ tone = 'neutral', className, children, ...rest }: CardIconProps) {
  return (
    <span className={cx(styles.icon, toneClass[tone], className)} aria-hidden {...rest}>
      {children}
    </span>
  );
}

type TitleProps = React.HTMLAttributes<HTMLElement> & { as?: React.ElementType };

function CardTitle({ as, className, children, ...rest }: TitleProps) {
  const Component = (as || 'h3') as React.ElementType;
  return (
    <Component className={cx(styles.title, className)} {...rest}>
      {children}
    </Component>
  );
}

function CardLabel({ as, className, children, ...rest }: TitleProps) {
  const Component = (as || 'p') as React.ElementType;
  return (
    <Component className={cx(styles.label, className)} {...rest}>
      {children}
    </Component>
  );
}

type ActionOwnProps = { as?: React.ElementType; className?: string; children?: React.ReactNode };
type ActionProps = ActionOwnProps &
  Omit<React.HTMLAttributes<HTMLElement>, keyof ActionOwnProps> &
  Record<string, unknown>;

function CardAction({ as, className, children, ...rest }: ActionProps) {
  const Component = (as || 'span') as React.ElementType;
  return (
    <Component className={cx(styles.action, className)} {...rest}>
      {children}
    </Component>
  );
}

function CardBody({ className, children, ...rest }: DivProps) {
  const { variant } = React.useContext(CardContext);
  return (
    <div
      className={cx(styles.body, variant === 'flush' && styles.bodyFlush, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...rest }: DivProps) {
  const { variant } = React.useContext(CardContext);
  return (
    <div
      className={cx(styles.footer, variant === 'flush' && styles.footerFlush, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ============================================================
   Skeleton & empty state — radius/padding/shadow identik dengan
   kartu asli supaya tidak ada pergeseran layout saat data masuk.
   ============================================================ */

interface CardSkeletonProps {
  padding?: CardPadding;
  /** Jumlah baris placeholder di dalam Body. */
  lines?: number;
  /** Tampilkan placeholder ikon + judul di header. */
  header?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function CardSkeleton({
  padding = 'normal',
  lines = 3,
  header = true,
  className,
  style,
}: CardSkeletonProps) {
  return (
    <CardRoot padding={padding} className={className} style={style} aria-hidden>
      {header && (
        <CardHeader>
          <span className={styles.skeletonIcon} />
          <span className={styles.skeletonLine} style={{ height: 13, width: '46%' }} />
        </CardHeader>
      )}
      <CardBody>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={styles.skeletonLine}
            style={{ height: i === 0 ? 24 : 12, width: i === 0 ? '62%' : `${92 - i * 12}%` }}
          />
        ))}
      </CardBody>
    </CardRoot>
  );
}

interface CardEmptyProps {
  children?: React.ReactNode;
  className?: string;
}

function CardEmpty({ children = 'Tidak ada data.', className }: CardEmptyProps) {
  return (
    <CardRoot className={className}>
      <CardBody className={styles.empty}>{children}</CardBody>
    </CardRoot>
  );
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Icon: CardIcon,
  Title: CardTitle,
  Label: CardLabel,
  Action: CardAction,
  Body: CardBody,
  Footer: CardFooter,
  Skeleton: CardSkeleton,
  Empty: CardEmpty,
});

export {
  CardHeader,
  CardIcon,
  CardTitle,
  CardLabel,
  CardAction,
  CardBody,
  CardFooter,
  CardSkeleton,
  CardEmpty,
};
