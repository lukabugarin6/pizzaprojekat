import * as React from 'react';

type Props = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

export const CartSvg: React.FC<Props> = ({ title, ...props }) => {
  const titleId = React.useId();

  return (
    <svg
      version="1.1"
      id="shopping_x5F_carts_1_"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 128 128"
      xmlSpace="preserve"
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      role="img"
      {...props}
      className="cart-icon"
    >
      {title ? <title id={titleId}>{title}</title> : null}

      <g id="_x33__1_">
        <g id="icon_12_">
          <path
            fill="currentColor"
            d="M51.5,97.4c-5.4,0-9.7,4.4-9.7,9.7c0,5.4,4.4,9.7,9.7,9.7s9.7-4.4,9.7-9.7C61.2,101.8,56.9,97.4,51.5,97.4z
			 M51.5,111.3c-2.3,0-4.2-1.9-4.2-4.2s1.9-4.2,4.2-4.2c2.3,0,4.2,1.9,4.2,4.2S53.8,111.3,51.5,111.3z M19.7,13.4
			c-0.3-1.3-1.4-2.2-2.7-2.2H2.8c-1.5,0-2.8,1.2-2.8,2.8c0,1.5,1.2,2.8,2.8,2.8h11.9L41,92.4c0.3,1.3,1.4,2.2,2.7,2.2h73.1V89H46
			L19.7,13.4z M104.3,97.4c-5.4,0-9.7,4.4-9.7,9.7c0,5.4,4.4,9.7,9.7,9.7c5.4,0,9.7-4.4,9.7-9.7C114.1,101.8,109.7,97.4,104.3,97.4z
			 M104.3,111.3c-2.3,0-4.2-1.9-4.2-4.2s1.9-4.2,4.2-4.2s4.2,1.9,4.2,4.2S106.7,111.3,104.3,111.3z M33.4,33.4l2.8,5.6h5.6l79.4,0
			c0,0-0.5,3.4-2.5,8.3H38.3l0.7,2.8h78.5c-0.9,2-2.1,4.2-3.5,6.5c-0.4,0.6-0.9,1.2-1.4,1.8H41.1l0.7,2.8h67.8
			c-7,5.6-18.5,8.3-25.6,8.3c-5.2,0-36.3,0-39.3,0h0c-0.1,0-0.2,0-0.2,0c0,0,0.1,0,0.2,0l-0.2,0l2.8,5.6c0,0,27.9,0,33.4,0
			c16,0,29.1-4.9,36.2-13.9C126.4,49,128,33.4,128,33.4H33.4z M109.7,61.2l2.7-2.6C111.6,59.5,110.7,60.4,109.7,61.2z"
          />
        </g>
      </g>
    </svg>
  );
};

export default CartSvg;
